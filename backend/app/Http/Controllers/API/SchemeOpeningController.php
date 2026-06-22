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

        // Pre-load lookup tables into memory for validation speed
        $usersMap = User::select('id', 'name')->get()->keyBy(fn($u) => strtolower(trim($u->name)))->toArray();
        $branches = Branch::select('id', 'name', 'code')->get();
        $schemes  = Scheme::select('id', 'name', 'code', 'total_installments')->get();

        $branchesMap = [];
        foreach ($branches as $b) {
            $branchesMap[(string) $b->id] = $b->toArray();
            $branchesMap[strtolower(trim($b->name))] = $b->toArray();
            if (!empty($b->code)) {
                $branchesMap[strtolower(trim($b->code))] = $b->toArray();
            }
        }

        $schemesMap = [];
        foreach ($schemes as $s) {
            $schemesMap[(string) $s->id] = $s->toArray();
            $schemesMap[strtolower(trim($s->name))] = $s->toArray();
            if (!empty($s->code)) {
                $schemesMap[strtolower(trim($s->code))] = $s->toArray();
            }
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

        // Pre-load lookup tables into memory for validation speed
        $usersMap = User::select('id', 'name')->get()->keyBy(fn($u) => strtolower(trim($u->name)))->toArray();
        $branches = Branch::select('id', 'name', 'code')->get();
        $schemes  = Scheme::select('id', 'name', 'code', 'total_installments')->get();

        $branchesMap = [];
        foreach ($branches as $b) {
            $branchesMap[(string) $b->id] = $b->toArray();
            $branchesMap[strtolower(trim($b->name))] = $b->toArray();
            if (!empty($b->code)) {
                $branchesMap[strtolower(trim($b->code))] = $b->toArray();
            }
        }

        $schemesMap = [];
        foreach ($schemes as $s) {
            $schemesMap[(string) $s->id] = $s->toArray();
            $schemesMap[strtolower(trim($s->name))] = $s->toArray();
            if (!empty($s->code)) {
                $schemesMap[strtolower(trim($s->code))] = $s->toArray();
            }
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
        $branches  = Branch::select('id', 'name', 'code')->get();
        $schemes   = Scheme::select('id', 'name', 'code', 'total_installments')->get();
        $customers = Customer::select('id', 'mobile')->whereNotNull('mobile')
                              ->get()->keyBy(fn($c) => trim($c->mobile));

        // Build fast branch lookup map keyed by id / lowercase-name / lowercase-code
        $branchMap = [];
        foreach ($branches as $b) {
            $branchMap[(string) $b->id]                  = $b;
            $branchMap[strtolower(trim($b->name))]       = $b;
            if (!empty($b->code)) $branchMap[strtolower(trim($b->code))] = $b;
        }

        // Build fast scheme lookup map keyed by id / lowercase-name / lowercase-code
        $schemeMap = [];
        foreach ($schemes as $s) {
            $schemeMap[(string) $s->id]                  = $s;
            $schemeMap[strtolower(trim($s->name))]       = $s;
            if (!empty($s->code)) $schemeMap[strtolower(trim($s->code))] = $s;
        }

        $processedCount = 0;
        $failedCount    = 0;
        $errors         = [];
        $insertBatch    = [];
        $failedBatch    = [];

        foreach ($rows as $index => $row) {
            $data     = $row['data'] ?? $row;
            $rowCount = $row['index'] ?? ($index + 1);

            try {
                // Column map (10 cols):
                // 0:Account Name, 1:City, 2:MobileNo, 3:Salesman, 4:SchemeType,
                // 5:Total Amount, 6:Installment Amount, 7:Number of Months, 8:Branch, 9:Scheme

                $schemeTypeRaw = trim($data[4] ?? '');
                $schemeType    = ucfirst(strtolower($schemeTypeRaw));
                if ($schemeType !== 'Amount' && $schemeType !== 'Weight') $schemeType = 'Amount';

                $branchRaw = trim($data[8] ?? '');
                $schemeRaw = trim($data[9] ?? '');
                $mobileRaw = trim($data[2] ?? '');
                $salesman  = trim($data[3] ?? '');

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

                // Resolve branch from memory map
                $branchId   = null;
                $branchName = $branchRaw;
                if (!empty($branchRaw)) {
                    $b = $branchMap[strtolower($branchRaw)] ?? ($branchMap[(string)(int)$branchRaw] ?? null);
                    if ($b) { $branchId = $b->id; $branchName = $b->name; }
                }

                // Resolve scheme from memory map
                $schemeId   = null;
                $schemeName = $schemeRaw;
                if (!empty($schemeRaw)) {
                    $s = $schemeMap[strtolower($schemeRaw)] ?? ($schemeMap[(string)(int)$schemeRaw] ?? null);
                    if ($s) { $schemeId = $s->id; $schemeName = $s->name; }
                }

                // Resolve customer from memory map
                $customerId = $cleanMobile !== '' ? $customers->get($cleanMobile)?->id : null;

                $totalAmount = (float) str_replace(',', '', trim($data[5] ?? '0'));
                $instAmount  = (float) str_replace(',', '', trim($data[6] ?? '0'));
                $numMonths   = (int) trim($data[7] ?? '0');
                if ($numMonths <= 0 && $instAmount > 0) {
                    $numMonths = (int) floor($totalAmount / $instAmount);
                }

                $insertBatch[] = [
                    'opening_no'         => 'OP-' . strtoupper(Str::random(6)),
                    'opening_date'       => $today,
                    'account_name'       => trim($data[0] ?? ''),
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
                    'scheme_type'        => trim($data[4] ?? ''),
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
            'success'        => true,
            'message'        => 'Scheme openings import staging completed',
            'processed_rows' => $processedCount,
            'failed_rows'    => $failedCount,
            'batch_id'       => $batchId,
            'errors'         => $errors
        ]);
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

        $query = SchemeOpening::where('status', 'Pending');

        if (!empty($recordIds)) {
            $query->whereIn('id', $recordIds);
        } else {
            $query->where('import_batch_id', $batchId);
        }

        $pendingData = $query->get();
        $schemeMap = $this->processingService->buildSchemeMap();

        $processedCount = 0;
        $failedCount = 0;
        $resolvedSalesmen = [];

        foreach ($pendingData as $data) {
            if ($this->processingService->processOne($data, $schemeMap, $resolvedSalesmen)) {
                $processedCount++;
            } else {
                $failedCount++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully processed $processedCount scheme opening records. $failedCount failed.",
            'processed' => $processedCount,
            'failed' => $failedCount,
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

        $query = SchemeOpening::where('status', 'Pending');

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

        $record = SchemeOpening::create([
            'opening_no' => $openingNo,
            'opening_date' => $formattedDate,
            'account_name' => $request->input('account_name'),
            'city' => $request->input('city'),
            'mobile_no' => $request->input('mobile_no'),
            'salesman' => $salesman,
            'salesman_user_id' => $salesmanUser ? $salesmanUser->id : null,
            'scheme_type' => $schemeType,
            'total_amount' => $request->input('total_amount') ?? 0,
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
     * Helper to validate single row data.
     */
    protected function validateRowData(array $data, int $rowCount, ?array $usersMap = null, ?array $branchesMap = null, ?array $schemesMap = null): array
    {
        $rowErrors = [];

        // Expect 10 columns:
        // 0:Account Name, 1:City, 2:MobileNo, 3:Salesman, 4:SchemeType,
        // 5:Total Amount, 6:Installment Amount, 7:Number of Months, 8:Branch, 9:Scheme
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

        // 3. Scheme Type (Column 4 — must be Amount or Weight)
        $schemeType = trim($data[4] ?? '');
        if (empty($schemeType)) {
            $rowErrors[] = ['column' => 4, 'message' => "Scheme Type is required."];
        } else {
            $normalizedType = ucfirst(strtolower($schemeType));
            if ($normalizedType !== 'Amount' && $normalizedType !== 'Weight') {
                $rowErrors[] = ['column' => 4, 'message' => "Scheme Type must be 'Amount' or 'Weight'."];
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

        // 7. Branch (Column 8 — optional, accepts ID or name/code)
        $branchRaw = trim($data[8] ?? '');
        if (!empty($branchRaw)) {
            if ($branchesMap !== null) {
                $bKey = strtolower($branchRaw);
                $branch = isset($branchesMap[$bKey]) ? $branchesMap[$bKey] : (isset($branchesMap[(string)(int)$branchRaw]) ? $branchesMap[(string)(int)$branchRaw] : null);
                if (!$branch) {
                    $rowErrors[] = ['column' => 8, 'message' => "Branch '$branchRaw' not found."];
                }
            } else {
                $branch = is_numeric($branchRaw)
                    ? Branch::find((int) $branchRaw)
                    : Branch::where('name', 'ilike', '%' . $branchRaw . '%')
                          ->orWhere('code', 'ilike', '%' . $branchRaw . '%')
                          ->first();
                if (!$branch) {
                    $rowErrors[] = ['column' => 8, 'message' => "Branch '$branchRaw' not found."];
                }
            }
        }

        // 8. Scheme (Column 9 — required, accepts ID or name/code)
        $schemeRaw = trim($data[9] ?? '');
        if (empty($schemeRaw)) {
            $rowErrors[] = ['column' => 9, 'message' => 'Scheme is required.'];
        } else {
            if ($schemesMap !== null) {
                $sKey = strtolower($schemeRaw);
                $scheme = isset($schemesMap[$sKey]) ? $schemesMap[$sKey] : (isset($schemesMap[(string)(int)$schemeRaw]) ? $schemesMap[(string)(int)$schemeRaw] : null);
                if (!$scheme) {
                    $rowErrors[] = ['column' => 9, 'message' => "Scheme '$schemeRaw' not found in system schemes."];
                }
            } else {
                $scheme = is_numeric($schemeRaw)
                    ? Scheme::find((int) $schemeRaw)
                    : Scheme::where('name', 'ilike', '%' . $schemeRaw . '%')
                          ->orWhere('code', 'ilike', '%' . $schemeRaw . '%')
                          ->first();
                if (!$scheme) {
                    $rowErrors[] = ['column' => 9, 'message' => "Scheme '$schemeRaw' not found in system schemes."];
                }
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
