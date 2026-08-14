<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\SchemeOpening;
use App\Models\Scheme;
use App\Models\User;
use App\Models\Branch;
use App\Jobs\ProcessSchemeOpeningRowJob;
use App\Services\CustomerService;
use App\Services\OneClickEnrollmentService;
use App\Services\SchemeOpeningProcessingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class SchemeOpeningController extends Controller
{
    protected $customerService;
    protected $oneClickEnrollmentService;
    protected $processingService;

    public function __construct(
        CustomerService $customerService,
        OneClickEnrollmentService $oneClickEnrollmentService,
        SchemeOpeningProcessingService $processingService
    ) {
        $this->customerService = $customerService;
        $this->oneClickEnrollmentService = $oneClickEnrollmentService;
        $this->processingService = $processingService;
    }

    /**
     * List imported scheme opening entries.
     */
    public function index(Request $request)
    {
        $query = SchemeOpening::with(['customer', 'scheme', 'salesmanUser', 'branch']);

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('import_batch_id') && $request->import_batch_id) {
            $query->where('import_batch_id', $request->import_batch_id);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('account_name', 'ilike', '%' . $search . '%')
                  ->orWhere('mobile_no', 'ilike', '%' . $search . '%')
                  ->orWhere('opening_no', 'ilike', '%' . $search . '%')
                  ->orWhere('scheme_name', 'ilike', '%' . $search . '%');
            });
        }

        $perPage = max(1, min((int) $request->input('per_page', 15), 200));

        $entries = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($entries);
    }

    /**
     * Validate an uploaded file (CSV).
     */
    public function validateImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ], [
            'file.mimes' => 'The uploaded file must be a CSV file. Excel (.xlsx/.xls) is not supported directly; please save it as CSV first.'
        ]);

        ini_set('auto_detect_line_endings', true);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);

        $rows = [];
        $rowCount = 0;
        $totalErrors = 0;

        // Pre-load lookup tables into memory for validation speed — Branch/Scheme
        // columns are numeric IDs only, so the maps are keyed by id alone.
        $usersMap = User::select('id', 'name')->get()->keyBy(fn($u) => strtolower(trim($u->name)))->toArray();
        $branches = Branch::select('id', 'name')->get();
        $schemes  = Scheme::select('id', 'name', 'total_installments')->get();

        $branchesMap = [];
        foreach ($branches as $b) {
            $branchesMap[(string) $b->id] = $b->toArray();
        }

        $schemesMap = [];
        foreach ($schemes as $s) {
            $schemesMap[(string) $s->id] = $s->toArray();
        }

        while (($data = fgetcsv($handle)) !== false) {
            $rowCount++;
            if (empty(array_filter($data))) continue;

            $rowResult = $this->validateRowData($data, $rowCount, $usersMap, $branchesMap, $schemesMap);
            $rows[] = $rowResult;

            if (!$rowResult['is_valid']) {
                $totalErrors++;
            }
        }

        fclose($handle);

        return response()->json([
            'success' => true,
            'is_all_valid' => $totalErrors === 0,
            'error_count' => $totalErrors,
            'total_rows' => count($rows),
            'header' => $header,
            'rows' => $rows
        ]);
    }

    /**
     * Validate multiple rows of data sent directly as JSON.
     */
    public function validateRows(Request $request)
    {
        $request->validate([
            'rows' => 'required|array',
        ]);

        $inputRows = $request->input('rows');
        $results = [];
        $totalErrors = 0;

        // Pre-load lookup tables into memory for validation speed — Branch/Scheme
        // columns are numeric IDs only, so the maps are keyed by id alone.
        $usersMap = User::select('id', 'name')->get()->keyBy(fn($u) => strtolower(trim($u->name)))->toArray();
        $branches = Branch::select('id', 'name')->get();
        $schemes  = Scheme::select('id', 'name', 'total_installments')->get();

        $branchesMap = [];
        foreach ($branches as $b) {
            $branchesMap[(string) $b->id] = $b->toArray();
        }

        $schemesMap = [];
        foreach ($schemes as $s) {
            $schemesMap[(string) $s->id] = $s->toArray();
        }

        foreach ($inputRows as $row) {
            $data = $row['data'] ?? [];
            $index = $row['index'] ?? 1;

            $rowResult = $this->validateRowData($data, $index, $usersMap, $branchesMap, $schemesMap);
            $results[] = $rowResult;

            if (!$rowResult['is_valid']) {
                $totalErrors++;
            }
        }

        return response()->json([
            'success' => true,
            'is_all_valid' => $totalErrors === 0,
            'error_count' => $totalErrors,
            'rows' => $results
        ]);
    }

    /**
     * Import multiple rows of data from preview (stages records into DB).
     * Optimized: pre-loads all lookup tables once, then batch-inserts in a single transaction.
     */
    public function importRows(Request $request)
    {
        $request->validate([
            'rows'     => 'required|array',
            'batch_id' => 'nullable|string'
        ]);

        $rows    = $request->input('rows');
        $batchId = $request->input('batch_id') ?? (string) Str::uuid();
        $now     = now()->format('Y-m-d H:i:s');
        $today   = now()->format('Y-m-d');

        // Pre-load lookup tables into memory (4 queries total instead of 4*N)
        $users     = User::select('id', 'name')->get()->keyBy(fn($u) => strtolower(trim($u->name)));
        $branches  = Branch::select('id', 'name')->get();
        $schemes   = Scheme::select('id', 'name', 'total_installments', 'scheme_type')->get();
        $customers = Customer::select('id', 'mobile')->whereNotNull('mobile')
                              ->get()->keyBy(fn($c) => trim($c->mobile));

        // Build fast branch lookup map keyed by id — Branch/Scheme columns are numeric IDs only
        $branchMap = [];
        foreach ($branches as $b) {
            $branchMap[(string) $b->id] = $b;
        }

        // Build fast scheme lookup map keyed by id
        $schemeMap = [];
        foreach ($schemes as $s) {
            $schemeMap[(string) $s->id] = $s;
        }

        // Pre-load duplicate-detection keys (exact match on Account Name + Mobile
        // No + Scheme + Total Amount + Opening Date) from both already-staged
        // scheme_openings (any status) and already-enrolled Memberships (via
        // their opening payment) — so re-importing the same file, or
        // re-enrolling someone already a member of that scheme on the same
        // date, is skipped instead of duplicated. A different opening date is
        // treated as a legitimate separate enrollment (e.g. a renewal), not a duplicate.
        $existingKeys = [];

        DB::table('scheme_openings')
            ->select('account_name', 'mobile_no', 'scheme_id', 'total_amount', 'opening_date')
            ->get()
            ->each(function ($row) use (&$existingKeys) {
                if (!$row->scheme_id) return;
                $existingKeys[$this->duplicateKey($row->account_name, $row->mobile_no, $row->scheme_id, $row->total_amount, $row->opening_date)] = true;
            });

        DB::table('memberships')
            ->join('customers', 'customers.id', '=', 'memberships.customer_id')
            ->join('payments', 'payments.membership_id', '=', 'memberships.id')
            ->select('customers.name as account_name', 'customers.mobile as mobile_no', 'memberships.scheme_id', 'payments.amount as total_amount', 'memberships.start_date as opening_date')
            ->get()
            ->each(function ($row) use (&$existingKeys) {
                if (!$row->scheme_id) return;
                $existingKeys[$this->duplicateKey($row->account_name, $row->mobile_no, $row->scheme_id, $row->total_amount, $row->opening_date)] = true;
            });

        $processedCount     = 0;
        $failedCount        = 0;
        $skippedDuplicates  = 0;
        $errors             = [];
        $insertBatch        = [];
        $failedBatch        = [];

        foreach ($rows as $index => $row) {
            $data     = $row['data'] ?? $row;
            $rowCount = $row['index'] ?? ($index + 1);

            try {
                // Column map (10 cols):
                // 0:Account Name, 1:City, 2:MobileNo, 3:Salesman, 4:Joining Date,
                // 5:Total Amount, 6:Installment Amount, 7:Number of Months, 8:Branch ID, 9:Scheme ID

                $branchRaw = trim($data[8] ?? '');
                $schemeRaw = trim($data[9] ?? '');
                $mobileRaw = trim($data[2] ?? '');
                $salesman  = trim($data[3] ?? '');

                // Joining Date (optional — falls back to today when blank or unparseable)
                $joiningDateRaw = trim($data[4] ?? '');
                $openingDate    = $today;
                if (!empty($joiningDateRaw)) {
                    try {
                        $cleanDate   = str_replace('/', '-', $joiningDateRaw);
                        $openingDate = Carbon::createFromFormat('d-m-Y', $cleanDate)->format('Y-m-d');
                    } catch (\Exception $e) {
                        try {
                            $openingDate = Carbon::parse($joiningDateRaw)->format('Y-m-d');
                        } catch (\Exception $ex) {
                            $openingDate = $today;
                        }
                    }
                }

                // Mobile (no validation — accepted as-is, normalized to digits only when present)
                $cleanMobile = '';
                if (!empty($mobileRaw)) {
                    $cleanMobile = preg_replace('/[^0-9]/', '', $mobileRaw);
                    if (strlen($cleanMobile) > 10) $cleanMobile = substr($cleanMobile, -10);
                }

                // Resolve salesman from memory map
                $salesmanId = null;
                if (!empty($salesman)) {
                    $u = $users->get(strtolower($salesman))
                        ?? $users->first(fn($usr) => str_contains(strtolower($usr->name), strtolower($salesman)));
                    if ($u) $salesmanId = $u->id;
                }

                // Resolve branch from memory map — Branch ID is a plain numeric ID only
                $branchId   = null;
                $branchName = $branchRaw;
                if (!empty($branchRaw) && ctype_digit($branchRaw)) {
                    $b = $branchMap[(string) (int) $branchRaw] ?? null;
                    if ($b) { $branchId = $b->id; $branchName = $b->name; }
                }

                // Resolve scheme from memory map — Scheme ID is a plain numeric ID only.
                // The scheme's own scheme_type (Amount/Weight) is used directly.
                $schemeId   = null;
                $schemeName = $schemeRaw;
                $schemeType = 'Amount';
                if (!empty($schemeRaw) && ctype_digit($schemeRaw)) {
                    $s = $schemeMap[(string) (int) $schemeRaw] ?? null;
                    if ($s) { $schemeId = $s->id; $schemeName = $s->name; $schemeType = $s->scheme_type ?? 'Amount'; }
                }

                // Resolve customer from memory map
                $customerId = $cleanMobile !== '' ? $customers->get($cleanMobile)?->id : null;

                $accountName = trim($data[0] ?? '');
                $totalAmount = (float) str_replace(',', '', trim($data[5] ?? '0'));
                $instAmount  = (float) str_replace(',', '', trim($data[6] ?? '0'));
                $numMonths   = (int) trim($data[7] ?? '0');
                if ($numMonths <= 0 && $instAmount > 0) {
                    $numMonths = (int) floor($totalAmount / $instAmount);
                }

                // Duplicate check: exact match on Account Name + Mobile No + Scheme +
                // Total Amount + Opening Date against existing staged/enrolled entries
                // (and earlier rows already queued in this same batch) — skip silently,
                // no insert. A different opening date is treated as a separate, legitimate
                // enrollment rather than a duplicate.
                if ($schemeId && $cleanMobile !== '') {
                    $dupKey = $this->duplicateKey($accountName, $cleanMobile, $schemeId, $totalAmount, $openingDate);
                    if (isset($existingKeys[$dupKey])) {
                        $skippedDuplicates++;
                        continue;
                    }
                    $existingKeys[$dupKey] = true;
                }

                $insertBatch[] = [
                    'opening_no'         => 'OP-' . strtoupper(Str::random(6)),
                    'opening_date'       => $openingDate,
                    'account_name'       => $accountName,
                    'city'               => trim($data[1] ?? ''),
                    'mobile_no'          => $cleanMobile !== '' ? $cleanMobile : null,
                    'salesman'           => $salesman,
                    'salesman_id'        => $salesmanId,
                    'scheme_type'        => $schemeType,
                    'total_amount'       => $totalAmount,
                    'installment_amount' => $instAmount,
                    'number_of_months'   => $numMonths,
                    'total_weight'       => 0,
                    'ticket_no'          => null,
                    'deposit_or_redeem'  => 'Deposit',
                    'branch_name'        => $branchName,
                    'branch_id'          => $branchId,
                    'scheme_name'        => $schemeName,
                    'scheme_id'          => $schemeId,
                    'customer_id'        => $customerId,
                    'narration'          => '',
                    'lot_no'             => null,
                    'import_batch_id'    => $batchId,
                    'status'             => 'Pending',
                    'error_message'      => null,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];
                $processedCount++;

            } catch (\Exception $e) {
                $failedCount++;
                $errors[] = "Row $rowCount: " . $e->getMessage();
                $failedBatch[] = [
                    'opening_no'         => 'OP-' . strtoupper(Str::random(6)),
                    'opening_date'       => $today,
                    'account_name'       => trim($data[0] ?? ''),
                    'city'               => trim($data[1] ?? ''),
                    'mobile_no'          => trim($data[2] ?? ''),
                    'salesman'           => trim($data[3] ?? ''),
                    'salesman_id'        => null,
                    'scheme_type'        => '',
                    'total_amount'       => (float) str_replace(',', '', trim($data[5] ?? '0')),
                    'installment_amount' => (float) str_replace(',', '', trim($data[6] ?? '0')),
                    'number_of_months'   => (int) trim($data[7] ?? '0'),
                    'total_weight'       => 0,
                    'ticket_no'          => null,
                    'deposit_or_redeem'  => 'Deposit',
                    'branch_name'        => trim($data[8] ?? ''),
                    'branch_id'          => null,
                    'scheme_name'        => trim($data[9] ?? ''),
                    'scheme_id'          => null,
                    'customer_id'        => null,
                    'narration'          => '',
                    'lot_no'             => null,
                    'import_batch_id'    => $batchId,
                    'status'             => 'Failed',
                    'error_message'      => $e->getMessage(),
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];
            }
        }

        // Single bulk insert inside one transaction (chunked to avoid parameter limits)
        DB::transaction(function () use ($insertBatch, $failedBatch) {
            foreach (array_chunk($insertBatch, 200) as $chunk) {
                DB::table('scheme_openings')->insert($chunk);
            }
            foreach (array_chunk($failedBatch, 200) as $chunk) {
                DB::table('scheme_openings')->insert($chunk);
            }
        });

        return response()->json([
            'success'            => true,
            'message'            => 'Scheme openings import staging completed',
            'processed_rows'     => $processedCount,
            'failed_rows'        => $failedCount,
            'skipped_duplicates' => $skippedDuplicates,
            'batch_id'           => $batchId,
            'errors'             => $errors
        ]);
    }

    /**
     * Build the exact-match duplicate-detection key for a scheme opening row:
     * Account Name + Mobile No + Scheme + Total Amount + Opening Date. Used to
     * compare incoming rows against both existing scheme_openings and already
     * enrolled Memberships (via their opening payment amount / start date).
     * Opening date is included so the same customer opening the same scheme
     * again on a different date (e.g. a renewal) is not flagged as a duplicate.
     */
    private function duplicateKey(?string $accountName, ?string $mobile, $schemeId, $totalAmount, $openingDate = null): string
    {
        $normalizedDate = '';
        if (!empty($openingDate)) {
            try {
                $normalizedDate = Carbon::parse($openingDate)->format('Y-m-d');
            } catch (\Exception $e) {
                $normalizedDate = trim((string) $openingDate);
            }
        }

        return strtolower(trim((string) $accountName))
            . '|' . trim((string) $mobile)
            . '|' . (int) $schemeId
            . '|' . number_format((float) $totalAmount, 2, '.', '')
            . '|' . $normalizedDate;
    }

    /**
     * Process staged scheme openings synchronously (foreground): enroll
     * customer, create membership, and post starting balance — blocks until
     * every matched row is done.
     */
    public function process(Request $request)
    {
        $batchId = $request->input('batch_id');
        $recordIds = $request->input('record_ids', []);

        // Explicitly selected rows (record_ids) can be retried whether they're
        // still Pending or previously Failed — that's what "Enroll / Process"
        // on a Failed row is for. Processed rows are never re-picked up.
        $query = SchemeOpening::whereIn('status', ['Pending', 'Failed']);

        if (!empty($recordIds)) {
            $query->whereIn('id', $recordIds);
        } else {
            $query->where('import_batch_id', $batchId);
        }

        $pendingData = $query->get();
        $schemeMap = $this->processingService->buildSchemeMap();

        $processedCount = 0;
        $failedCount = 0;
        $failedDetails = [];
        $resolvedSalesmen = [];

        foreach ($pendingData as $data) {
            if ($this->processingService->processOne($data, $schemeMap, $resolvedSalesmen)) {
                $processedCount++;
            } else {
                $failedCount++;
                $failedDetails[] = [
                    'id' => $data->id,
                    'account_name' => $data->account_name,
                    'error_message' => $data->error_message,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully processed $processedCount scheme opening records. $failedCount failed.",
            'processed' => $processedCount,
            'failed' => $failedCount,
            'failed_details' => $failedDetails,
        ]);
    }

    /**
     * Queue staged scheme openings for background processing — one job per
     * row, reusing the same processing logic as the synchronous endpoint.
     * Returns immediately; a worker (php artisan queue:work) must be running
     * for queued rows to actually flip from Pending to Processed/Failed.
     */
    public function processBackground(Request $request)
    {
        $batchId = $request->input('batch_id');
        $recordIds = $request->input('record_ids', []);

        // Same retry allowance as process() — see the comment there.
        $query = SchemeOpening::whereIn('status', ['Pending', 'Failed']);

        if (!empty($recordIds)) {
            $query->whereIn('id', $recordIds);
        } else {
            $query->where('import_batch_id', $batchId);
        }

        $ids = $query->pluck('id');

        foreach ($ids as $id) {
            ProcessSchemeOpeningRowJob::dispatch($id);
        }

        return response()->json([
            'success' => true,
            'message' => "Queued {$ids->count()} scheme opening record(s) for background processing.",
            'queued' => $ids->count(),
        ]);
    }

    /**
     * Get unique import batches list.
     */
    public function batches(Request $request)
    {
        $query = SchemeOpening::select('import_batch_id', DB::raw('count(*) as total'), DB::raw('max(created_at) as date'));
        
        if ($request->has('from_date') && $request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date') && $request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $batches = $query->groupBy('import_batch_id')
            ->orderBy('date', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $batches,
        ]);
    }

    /**
     * Get details of a specific batch.
     */
    public function batchDetails($batchId)
    {
        $details = SchemeOpening::where('import_batch_id', $batchId)
            ->with(['customer', 'scheme', 'salesmanUser', 'branch'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $details,
        ]);
    }

    /**
     * Delete an entire batch.
     */
    public function deleteBatch($batchId)
    {
        SchemeOpening::where('import_batch_id', $batchId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Staged batch deleted successfully'
        ]);
    }

    /**
     * Create a single record manually.
     */
    public function store(Request $request)
    {
        // Generate automatic opening number
        $openingNo = 'OP-' . strtoupper(Str::random(6));

        // Format and parse dates / users / schemes:
        $schemeType = $request->input('scheme_type');
        $schemeType = !empty($schemeType) ? ucfirst(strtolower($schemeType)) : 'Amount';

        // Resolve relations
        $salesman = $request->input('salesman');
        $salesmanUser = !empty($salesman) ? User::where('name', 'ilike', '%' . $salesman . '%')->first() : null;

        $branchName = $request->input('branch_name');
        $branch = !empty($branchName) ? Branch::where('name', 'ilike', '%' . $branchName . '%')->first() : null;

        $schemeName = $request->input('scheme_name');
        $scheme = !empty($schemeName) ? Scheme::where('name', 'ilike', '%' . $schemeName . '%')->orWhere('code', 'ilike', '%' . $schemeName . '%')->first() : null;

        $openingDate = $request->input('opening_date');
        $formattedDate = null;
        if (!empty($openingDate)) {
            try {
                $cleanDate = str_replace('/', '-', $openingDate);
                $formattedDate = Carbon::createFromFormat('d-m-Y', $cleanDate)->format('Y-m-d');
            } catch (\Exception $e) {
                try {
                    $formattedDate = Carbon::parse($openingDate)->format('Y-m-d');
                } catch (\Exception $ex) {}
            }
        }

        $accountName = $request->input('account_name');
        $mobileNo = $request->input('mobile_no');
        $totalAmount = $request->input('total_amount') ?? 0;

        // Duplicate check: exact match on Account Name + Mobile No + Scheme +
        // Total Amount + Opening Date against existing staged/enrolled entries —
        // reject instead of inserting. A different opening date is treated as a
        // separate, legitimate enrollment (e.g. a renewal), not a duplicate.
        if ($scheme && !empty($mobileNo)) {
            $dupKey = $this->duplicateKey($accountName, $mobileNo, $scheme->id, $totalAmount, $formattedDate);

            $existingOpening = DB::table('scheme_openings')
                ->where('mobile_no', $mobileNo)
                ->where('scheme_id', $scheme->id)
                ->select('account_name', 'mobile_no', 'scheme_id', 'total_amount', 'opening_date')
                ->get()
                ->first(fn ($row) => $this->duplicateKey($row->account_name, $row->mobile_no, $row->scheme_id, $row->total_amount, $row->opening_date) === $dupKey);

            $existingMembership = DB::table('memberships')
                ->join('customers', 'customers.id', '=', 'memberships.customer_id')
                ->join('payments', 'payments.membership_id', '=', 'memberships.id')
                ->where('customers.mobile', $mobileNo)
                ->where('memberships.scheme_id', $scheme->id)
                ->select('customers.name as account_name', 'customers.mobile as mobile_no', 'memberships.scheme_id', 'payments.amount as total_amount', 'memberships.start_date as opening_date')
                ->get()
                ->first(fn ($row) => $this->duplicateKey($row->account_name, $row->mobile_no, $row->scheme_id, $row->total_amount, $row->opening_date) === $dupKey);

            if ($existingOpening || $existingMembership) {
                return response()->json([
                    'success' => false,
                    'message' => 'A scheme opening entry for this Account Name, Mobile No, Scheme and Amount already exists on this Opening Date. Use a different date if this is a new, separate enrollment.'
                ], 422);
            }
        }

        $record = SchemeOpening::create([
            'opening_no' => $openingNo,
            'opening_date' => $formattedDate,
            'account_name' => $accountName,
            'city' => $request->input('city'),
            'mobile_no' => $mobileNo,
            'salesman' => $salesman,
            'salesman_user_id' => $salesmanUser ? $salesmanUser->id : null,
            'scheme_type' => $schemeType,
            'total_amount' => $totalAmount,
            'installment_amount' => $request->input('installment_amount') ?? 0,
            'number_of_months' => (function () use ($request) {
                $months = (int) ($request->input('number_of_months') ?? 0);
                if ($months <= 0) {
                    $total = (float) ($request->input('total_amount') ?? 0);
                    $installment = (float) ($request->input('installment_amount') ?? 0);
                    return $installment > 0 ? (int) floor($total / $installment) : 0;
                }
                return $months;
            })(),
            'total_weight' => $request->input('total_weight') ?? 0,
            'ticket_no' => $request->input('ticket_no'),
            'deposit_or_redeem' => $request->input('deposit_or_redeem') ?? 'Deposit',
            'branch_name' => $branchName,
            'branch_id' => $branch ? $branch->id : null,
            'narration' => $request->input('narration'),
            'lot_no' => $request->input('lot_no'),
            'scheme_name' => $schemeName,
            'scheme_id' => $scheme ? $scheme->id : null,
            'status' => 'Pending', // Staged and pending manual process/enrollment
            'import_batch_id' => 'MANUAL-ENTRY'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Scheme Opening entry created successfully.',
            'data' => $record
        ]);
    }

    /**
     * Delete a single staged record.
     */
    public function destroy($id)
    {
        $record = SchemeOpening::findOrFail($id);
        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'Staged record deleted successfully'
        ]);
    }

    /**
     * Update a single staged record.
     */
    public function update(Request $request, $id)
    {
        $record = SchemeOpening::findOrFail($id);
        $record->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Staged record updated successfully',
            'data' => $record
        ]);
    }

    /**
     * Bulk delete staged records.
     */
    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array']);
        SchemeOpening::whereIn('id', $request->input('ids'))->delete();

        return response()->json([
            'success' => true,
            'message' => 'Staged records deleted successfully'
        ]);
    }

    /**
     * DANGER — full test-data reset. Wipes every Membership (subscription),
     * every Customer, every salesman-role User, and everything that hangs off
     * them (payments, installments, receipts, accounting vouchers generated
     * from those receipts, Chart of Accounts ledgers used exclusively by
     * those vouchers, KYC, commissions, digital metal sales/purchases,
     * loyalty data, staged scheme openings). Ledgers still shared with other
     * modules (e.g. "Cash Account") are kept rather than deleted. Admin/staff
     * accounts without the 'salesman' role are left untouched so the system
     * stays usable. Gated by role:super-admin at the route level and by a
     * confirmation phrase from the client — irreversible.
     */
    public function resetAllData(Request $request)
    {
        $request->validate(['confirm' => 'required|string']);

        if ($request->input('confirm') !== 'DELETE ALL') {
            return response()->json([
                'success' => false,
                'message' => 'Confirmation phrase did not match. Type DELETE ALL to proceed.'
            ], 422);
        }

        $summary = DB::transaction(function () {
            $membershipIds = DB::table('memberships')->pluck('id');
            $customerIds   = DB::table('customers')->pluck('id');
            $salesmanIds   = User::role('salesman')->pluck('id');

            $counts = [
                'memberships' => $membershipIds->count(),
                'customers'   => $customerIds->count(),
                'salesmen'    => $salesmanIds->count(),
            ];

            // 1. Deepest children first — tables whose FK to memberships/customers
            // is RESTRICT (the default), which would otherwise block step 3/5.
            // Accounting vouchers generated from these receipts (voucher_type
            // defaults to RECEIPT) are subscription accounting data — captured
            // and removed here, before the receipt link is gone. Vouchers not
            // tied to a receipt (e.g. other business lines) are left alone.
            $receiptIds = DB::table('receipts')->pluck('id');
            $voucherIds = DB::table('vouchers')->whereIn('receipt_id', $receiptIds)->pluck('id');

            // Chart of Accounts ledgers touched by these vouchers — captured
            // before the voucher_transactions rows are gone, so we can tell
            // which ledgers were used exclusively by subscription vouchers.
            $candidateChartAccountIds = DB::table('voucher_transactions')
                ->whereIn('voucher_id', $voucherIds)
                ->whereNotNull('chart_of_account_id')
                ->distinct()
                ->pluck('chart_of_account_id');

            DB::table('voucher_transactions')->whereIn('voucher_id', $voucherIds)->delete();
            DB::table('vouchers')->whereIn('id', $voucherIds)->delete();

            // Only remove a ledger if no remaining (non-subscription) voucher_transaction
            // still references it — shared ledgers like "Cash Account" are kept.
            if ($candidateChartAccountIds->isNotEmpty()) {
                $stillUsedChartAccountIds = DB::table('voucher_transactions')
                    ->whereIn('chart_of_account_id', $candidateChartAccountIds)
                    ->distinct()
                    ->pluck('chart_of_account_id');

                $exclusiveChartAccountIds = $candidateChartAccountIds->diff($stillUsedChartAccountIds);
                DB::table('chart_of_accounts')->whereIn('id', $exclusiveChartAccountIds)->delete();
            }

            DB::table('receipts')->delete();       // cascades receipt_details/receipt_payments
            DB::table('payments')->delete();       // payments.membership_id is RESTRICT
            DB::table('installments')->delete();   // installments.membership_id is RESTRICT

            DB::table('digital_metal_sales')->whereIn('customer_id', $customerIds)->delete();     // customer_id RESTRICT, NOT NULL
            DB::table('digital_metal_purchases')->whereIn('customer_id', $customerIds)->delete();  // customer_id RESTRICT, NOT NULL

            // 2. Commission ledger rows have no DB-level FK, but are meaningless
            // once their membership/customer/salesman is gone — clean them up.
            DB::table('salesman_commissions')
                ->where(function ($q) use ($membershipIds, $customerIds, $salesmanIds) {
                    $q->whereIn('membership_id', $membershipIds)
                      ->orWhereIn('customer_id', $customerIds)
                      ->orWhereIn('salesman_id', $salesmanIds);
                })
                ->delete();

            // 3. Memberships (subscriptions) — nothing above blocks this now.
            DB::table('memberships')->delete();

            // 4. Staged scheme-opening entries — the source of new subscriptions.
            DB::table('scheme_openings')->delete();

            // 5. Customers — remaining children (KYC, feedback, support messages,
            // loyalty ledgers/sale data, join requests, gold-rate alerts,
            // appointments, pending payments) cascade or SET NULL automatically.
            DB::table('customers')->delete();

            // 6. Salesman-role users — null RESTRICT audit columns on master
            // tables first, delete owned transactions (RESTRICT, NOT NULL),
            // clean Spatie role/permission pivot rows (no real FK, would
            // otherwise be left orphaned), then delete the users themselves.
            if ($salesmanIds->isNotEmpty()) {
                foreach ([
                    ['metal_masters', 'created_by'],
                    ['metal_rate_logs', 'updated_by'],
                    ['digital_metal_masters', 'created_by'],
                    ['digital_metal_master_logs', 'updated_by'],
                    ['voucher_setups', 'updated_by'],
                    ['metal_buying_options', 'created_by'],
                    ['metal_buying_options', 'updated_by'],
                    ['metal_redeem_options', 'created_by'],
                    ['metal_redeem_options', 'updated_by'],
                    ['loyalty_setups', 'created_by'],
                    ['loyalty_setups', 'updated_by'],
                ] as [$table, $column]) {
                    DB::table($table)->whereIn($column, $salesmanIds)->update([$column => null]);
                }

                DB::table('transactions')->whereIn('user_id', $salesmanIds)->delete();
                DB::table('salesman_commission_overrides')->whereIn('salesman_id', $salesmanIds)->delete();
                DB::table('model_has_roles')->where('model_type', User::class)->whereIn('model_id', $salesmanIds)->delete();
                DB::table('model_has_permissions')->where('model_type', User::class)->whereIn('model_id', $salesmanIds)->delete();

                DB::table('users')->whereIn('id', $salesmanIds)->delete();
            }

            return $counts;
        });

        return response()->json([
            'success' => true,
            'message' => sprintf(
                'Reset complete. Deleted %d subscription(s), %d customer(s), %d salesman user(s), plus all related payments, installments, receipts, accounting vouchers, exclusively-used Chart of Accounts ledgers, KYC, commissions, digital metal sales/purchases, loyalty data and staged scheme openings.',
                $summary['memberships'],
                $summary['customers'],
                $summary['salesmen']
            ),
            'deleted' => $summary,
        ]);
    }

    /**
     * Helper to validate single row data.
     */
    protected function validateRowData(array $data, int $rowCount, ?array $usersMap = null, ?array $branchesMap = null, ?array $schemesMap = null): array
    {
        $rowErrors = [];

        // Expect 10 columns:
        // 0:Account Name, 1:City, 2:MobileNo, 3:Salesman, 4:Joining Date,
        // 5:Total Amount, 6:Installment Amount, 7:Number of Months, 8:Branch ID, 9:Scheme ID
        if (count($data) < 10) {
            $rowErrors[] = ['column' => -1, 'message' => 'Invalid column count. Expected 10 columns, found ' . count($data)];
            return [
                'index' => $rowCount,
                'data'  => $data,
                'errors' => $rowErrors,
                'is_valid' => false
            ];
        }

        // 1. Account Name (Column 0)
        $accountName = trim($data[0] ?? '');
        if (empty($accountName)) {
            $rowErrors[] = ['column' => 0, 'message' => 'Account Name is required.'];
        }

        // 2. Mobile Number (Column 2 — not validated, accepted as-is or blank)

        // 3. Joining Date (Column 4 — optional; if present must be a parseable date)
        $joiningDate = trim($data[4] ?? '');
        if (!empty($joiningDate)) {
            $cleanJoiningDate = str_replace('/', '-', $joiningDate);
            try {
                Carbon::createFromFormat('d-m-Y', $cleanJoiningDate);
            } catch (\Exception $e) {
                try {
                    Carbon::parse($joiningDate);
                } catch (\Exception $ex) {
                    $rowErrors[] = ['column' => 4, 'message' => "Joining Date '$joiningDate' is invalid. Use DD-MM-YYYY format."];
                }
            }
        }

        // 4. Total Amount (Column 5)
        $totalAmount = str_replace(',', '', trim($data[5] ?? ''));
        if (!is_numeric($totalAmount) || (float) $totalAmount < 0) {
            $rowErrors[] = ['column' => 5, 'message' => 'Total Amount must be a valid number.'];
        }

        // 5. Installment Amount (Column 6)
        $instAmount = str_replace(',', '', trim($data[6] ?? ''));
        if (!is_numeric($instAmount) || (float) $instAmount < 0) {
            $rowErrors[] = ['column' => 6, 'message' => 'Installment Amount must be a valid number.'];
        }

        // 6. Salesman (Column 3 — fully optional, no validation error if not found)
        // If the salesman name does not match any system user, it is stored as plain text
        // and salesman_id will be null. No auto-creation of users occurs.
        // (validation intentionally skipped — leave salesman lookup to importRows)

        // 7. Branch ID (Column 8 — optional, must be a plain numeric ID)
        $branchRaw = trim($data[8] ?? '');
        if (!empty($branchRaw)) {
            if (!ctype_digit($branchRaw)) {
                $rowErrors[] = ['column' => 8, 'message' => "Branch ID must be a numeric ID, got '$branchRaw'."];
            } else {
                $branchKey = (string) (int) $branchRaw;
                $branch = $branchesMap !== null
                    ? ($branchesMap[$branchKey] ?? null)
                    : Branch::find((int) $branchRaw);
                if (!$branch) {
                    $rowErrors[] = ['column' => 8, 'message' => "Branch ID $branchRaw not found."];
                }
            }
        }

        // 8. Scheme ID (Column 9 — required, must be a plain numeric ID)
        $schemeRaw = trim($data[9] ?? '');
        if (empty($schemeRaw)) {
            $rowErrors[] = ['column' => 9, 'message' => 'Scheme ID is required.'];
        } elseif (!ctype_digit($schemeRaw)) {
            $rowErrors[] = ['column' => 9, 'message' => "Scheme ID must be a numeric ID, got '$schemeRaw'."];
        } else {
            $schemeKey = (string) (int) $schemeRaw;
            $scheme = $schemesMap !== null
                ? ($schemesMap[$schemeKey] ?? null)
                : Scheme::find((int) $schemeRaw);
            if (!$scheme) {
                $rowErrors[] = ['column' => 9, 'message' => "Scheme ID $schemeRaw not found in system schemes."];
            }
        }

        // 9. Number of Months (Column 7) — must not exceed the matched scheme's duration
        $numMonths = trim($data[7] ?? '');
        if ($numMonths !== '') {
            if (!preg_match('/^\d+$/', $numMonths)) {
                $rowErrors[] = ['column' => 7, 'message' => 'Number of Months must be a whole integer (no decimals or floats).'];
            } elseif (isset($scheme) && $scheme) {
                $schemeDuration = is_array($scheme) ? ($scheme['total_installments'] ?? null) : ($scheme->total_installments ?? null);

                if ($schemeDuration !== null && (int) $numMonths > (int) $schemeDuration) {
                    $rowErrors[] = ['column' => 7, 'message' => "Number of Months ($numMonths) cannot exceed the scheme duration ($schemeDuration months)."];
                }
            }
        }

        return [
            'index'    => $rowCount,
            'data'     => $data,
            'errors'   => $rowErrors,
            'is_valid' => count($rowErrors) === 0
        ];
    }
}
