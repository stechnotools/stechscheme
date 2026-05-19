<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\SchemeOpening;
use App\Models\Scheme;
use App\Models\User;
use App\Models\Branch;
use App\Services\CustomerService;
use App\Services\OneClickEnrollmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class SchemeOpeningController extends Controller
{
    protected $customerService;
    protected $oneClickEnrollmentService;

    public function __construct(
        CustomerService $customerService,
        OneClickEnrollmentService $oneClickEnrollmentService
    ) {
        $this->customerService = $customerService;
        $this->oneClickEnrollmentService = $oneClickEnrollmentService;
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

        $entries = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($entries);
    }

    /**
     * Validate an uploaded file (CSV).
     */
    public function validateImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);

        $rows = [];
        $rowCount = 0;
        $totalErrors = 0;

        while (($data = fgetcsv($handle)) !== false) {
            $rowCount++;
            if (empty(array_filter($data))) continue;

            $rowResult = $this->validateRowData($data, $rowCount);
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

        foreach ($inputRows as $row) {
            $data = $row['data'] ?? [];
            $index = $row['index'] ?? 1;
            
            $rowResult = $this->validateRowData($data, $index);
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
     */
    public function importRows(Request $request)
    {
        $request->validate([
            'rows' => 'required|array',
            'batch_id' => 'nullable|string'
        ]);

        $rows = $request->input('rows');
        $batchId = $request->input('batch_id') ?? (string) Str::uuid();
        
        $processedCount = 0;
        $failedCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $data = $row['data'] ?? $row; 
            $rowCount = ($row['index'] ?? ($index + 1));

            try {
                // Map columns (15 columns):
                // 0: Opening Date, 1: Account Name, 2: City, 3: MobileNo, 4: Salesman,
                // 5: SchemeType, 6: Total Amount, 7: Total Weight, 8: Ticket No, 9: Deposit Or Redeem,
                // 10: Branch Name, 11: Narration, 12: Scheme Name, 13: Installment Amount, 14: Number of Months
                
                $schemeTypeInput = trim($data[5] ?? '');
                $normalizedType = ucfirst(strtolower($schemeTypeInput));
                if (!empty($schemeTypeInput) && ($normalizedType === 'Amount' || $normalizedType === 'Weight')) {
                    $schemeTypeInput = $normalizedType;
                }

                $rowData = [
                    'opening_no' => 'OP-' . strtoupper(Str::random(6)),
                    'opening_date' => trim($data[0] ?? ''),
                    'account_name' => trim($data[1] ?? ''),
                    'city' => trim($data[2] ?? ''),
                    'mobile_no' => trim($data[3] ?? ''),
                    'salesman' => trim($data[4] ?? ''),
                    'scheme_type' => $schemeTypeInput,
                    'total_amount' => str_replace(',', '', trim($data[6] ?? '0')),
                    'installment_amount' => str_replace(',', '', trim($data[13] ?? '0')),
                    'number_of_months' => (int) trim($data[14] ?? '0'),
                    'total_weight' => str_replace(',', '', trim($data[7] ?? '0')),
                    'ticket_no' => trim($data[8] ?? ''),
                    'deposit_or_redeem' => trim($data[9] ?? ''),
                    'branch_name' => trim($data[10] ?? ''),
                    'narration' => trim($data[11] ?? ''),
                    'lot_no' => null,
                    'scheme_name' => trim($data[12] ?? ''),
                    'import_batch_id' => $batchId,
                    'status' => 'Pending',
                ];

                // 1. Date formatting
                try {
                    $cleanDate = str_replace('/', '-', $rowData['opening_date']);
                    $date = Carbon::createFromFormat('d-m-Y', $cleanDate);
                    $rowData['opening_date'] = $date->format('Y-m-d');
                } catch (\Exception $e) {
                    throw new \Exception("Invalid date format: " . $rowData['opening_date'] . ". Expected DD-MM-YYYY.");
                }

                // 2. Validate mobile number
                if (!empty($rowData['mobile_no'])) {
                    $cleanMobile = preg_replace('/[^0-9]/', '', $rowData['mobile_no']);
                    if (strlen($cleanMobile) > 10) $cleanMobile = substr($cleanMobile, -10);
                    if (strlen($cleanMobile) !== 10) {
                        throw new \Exception("Mobile Number must be exactly 10 digits.");
                    }
                    $rowData['mobile_no'] = $cleanMobile;
                } else {
                    throw new \Exception("Mobile Number is required.");
                }

                // 3. Resolve Salesman ID
                if (!empty($rowData['salesman'])) {
                    $salesmanUser = User::where('name', 'ilike', '%' . $rowData['salesman'] . '%')->first();
                    if ($salesmanUser) $rowData['salesman_id'] = $salesmanUser->id;
                }

                // 4. Resolve Branch ID
                if (!empty($rowData['branch_name'])) {
                    $branch = Branch::where('name', 'ilike', '%' . $rowData['branch_name'] . '%')->first();
                    if ($branch) $rowData['branch_id'] = $branch->id;
                }

                // 5. Resolve Scheme ID
                if (!empty($rowData['scheme_name'])) {
                    $scheme = Scheme::where('name', 'ilike', '%' . $rowData['scheme_name'] . '%')
                        ->orWhere('code', 'ilike', '%' . $rowData['scheme_name'] . '%')
                        ->first();
                    if ($scheme) $rowData['scheme_id'] = $scheme->id;
                }

                // 6. Look up Customer
                if (!empty($rowData['mobile_no'])) {
                    $customer = Customer::where('mobile', $rowData['mobile_no'])->first();
                    if ($customer) $rowData['customer_id'] = $customer->id;
                }

                SchemeOpening::create($rowData);
                $processedCount++;

            } catch (\Exception $e) {
                $failedCount++;
                $errors[] = "Row $rowCount: " . $e->getMessage();
                
                try {
                    // Try to save failed staging record for UI review/correction
                    if (isset($rowData)) {
                        $rowData['status'] = 'Failed';
                        $rowData['error_message'] = $e->getMessage();
                        if (empty($rowData['opening_date'])) $rowData['opening_date'] = now()->format('Y-m-d');
                        SchemeOpening::create($rowData);
                    }
                } catch (\Exception $inner) {
                    Log::error("Failed to save failed staged row: " . $inner->getMessage());
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Scheme openings import staging completed',
            'processed_rows' => $processedCount,
            'failed_rows' => $failedCount,
            'batch_id' => $batchId,
            'errors' => $errors
        ]);
    }

    /**
     * Process staged scheme openings: enroll customer, create membership, and post starting balance.
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

        $processedCount = 0;
        $failedCount = 0;

        foreach ($pendingData as $data) {
            DB::beginTransaction();
            try {
                // 1. Resolve or Create Customer
                $customer = null;
                if (!empty($data->mobile_no)) {
                    $customer = Customer::where('mobile', $data->mobile_no)->first();
                }
                
                if ($customer) {
                    // Synchronize customer branch if defined
                    if (!empty($data->branch_id)) {
                        $this->customerService->syncCustomerUser($customer, ['branch_id' => $data->branch_id]);
                    }
                } else {
                    // Automatically create Customer
                    $customer = $this->customerService->create([
                        'name' => $data->account_name,
                        'mobile' => $data->mobile_no,
                        'status' => 'active',
                        'join_date' => $data->opening_date->format('Y-m-d'),
                        'branch_id' => $data->branch_id,
                    ]);
                }
                
                $data->customer_id = $customer->id;

                // 2. Resolve Scheme
                $scheme = null;
                if (!empty($data->scheme_id)) {
                    $scheme = Scheme::find($data->scheme_id);
                }
                if (!$scheme && !empty($data->scheme_name)) {
                    $scheme = Scheme::where('name', 'ilike', '%' . $data->scheme_name . '%')
                        ->orWhere('code', 'ilike', '%' . $data->scheme_name . '%')
                        ->first();
                }

                if (!$scheme) {
                    throw new \Exception("Scheme not found. Please verify the Scheme Name.");
                }

                $data->scheme_id = $scheme->id;

                // 3. Perform One-Click Enrollment
                $enrollPayload = [
                    'customer' => [
                        'name' => $customer->name,
                        'mobile' => $customer->mobile,
                        'status' => 'active',
                    ],
                    'scheme_id' => $scheme->id,
                    'user_id' => $data->salesman_id,
                    'branch_id' => $data->branch_id,
                    'start_date' => $data->opening_date->format('Y-m-d'),
                    'payment' => [
                        'amount' => (float) $data->total_amount,
                        'gateway' => 'cash',
                        'payment_date' => $data->opening_date->format('Y-m-d'),
                        'status' => 'success',
                    ]
                ];

                $enrollResult = $this->oneClickEnrollmentService->enroll($enrollPayload);

                // Update the staged record details with the correct linked ids
                $data->status = 'Processed';
                $data->error_message = null;
                $data->save();

                DB::commit();
                $processedCount++;
            } catch (\Exception $e) {
                DB::rollBack();
                $data->status = 'Failed';
                $data->error_message = $e->getMessage();
                $data->save();
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
            'number_of_months' => $request->input('number_of_months') ?? 0,
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
    protected function validateRowData(array $data, int $rowCount): array
    {
        $rowErrors = [];

        // Expect 15 columns
        if (count($data) < 15) {
            $rowErrors[] = ['column' => -1, 'message' => 'Invalid column count. Expected 15 columns, found ' . count($data)];
            return [
                'index' => $rowCount,
                'data' => $data,
                'errors' => $rowErrors,
                'is_valid' => false
            ];
        }

        // 1. Opening Date Validation (Column 0)
        $openingDate = trim($data[0] ?? '');
        if (empty($openingDate)) {
            $rowErrors[] = ['column' => 0, 'message' => "Opening Date is required."];
        } else {
            try {
                $cleanDate = str_replace('/', '-', $openingDate);
                Carbon::createFromFormat('d-m-Y', $cleanDate);
            } catch (\Exception $e) {
                $rowErrors[] = ['column' => 0, 'message' => "Invalid date format: $openingDate. Expected DD-MM-YYYY."];
            }
        }

        // 2. Account Name Validation (Column 1)
        $accountName = trim($data[1] ?? '');
        if (empty($accountName)) {
            $rowErrors[] = ['column' => 1, 'message' => "Account Name is required."];
        }

        // 3. Mobile Number Validation (Column 3)
        $mobileNo = trim($data[3] ?? '');
        if (empty($mobileNo)) {
            $rowErrors[] = ['column' => 3, 'message' => "Mobile Number is required."];
        } else {
            $cleanMobile = preg_replace('/[^0-9]/', '', $mobileNo);
            if (strlen($cleanMobile) > 10) $cleanMobile = substr($cleanMobile, -10);
            if (strlen($cleanMobile) !== 10) {
                $rowErrors[] = ['column' => 3, 'message' => "Mobile Number must be 10 digits."];
            }
        }

        // 4. Scheme Type Validation (Column 5 - must be Amount or Weight)
        $schemeType = trim($data[5] ?? '');
        if (empty($schemeType)) {
            $rowErrors[] = ['column' => 5, 'message' => "Scheme Type is required."];
        } else {
            $normalizedType = ucfirst(strtolower($schemeType));
            if ($normalizedType !== 'Amount' && $normalizedType !== 'Weight') {
                $rowErrors[] = ['column' => 5, 'message' => "Scheme Type must be 'Amount' or 'Weight'."];
            }
        }

        // 5. Scheme Name Validation (Column 12)
        $schemeName = trim($data[12] ?? '');
        if (empty($schemeName)) {
            $rowErrors[] = ['column' => 12, 'message' => "Scheme Name is required."];
        } else {
            $scheme = Scheme::where('name', 'ilike', '%' . $schemeName . '%')
                ->orWhere('code', 'ilike', '%' . $schemeName . '%')
                ->first();
            if (!$scheme) {
                $rowErrors[] = ['column' => 12, 'message' => "Scheme '$schemeName' not found in system schemes."];
            }
        }

        // 6. Salesman Check (optional lookup - Column 4)
        $salesman = trim($data[4] ?? '');
        if (!empty($salesman)) {
            $salesmanUser = User::where('name', 'ilike', '%' . $salesman . '%')->first();
            if (!$salesmanUser) {
                $rowErrors[] = ['column' => 4, 'message' => "Salesman '$salesman' not found in system users."];
            }
        }

        // 7. Branch Name Check (optional lookup - Column 10)
        $branchName = trim($data[10] ?? '');
        if (!empty($branchName)) {
            $branch = Branch::where('name', 'ilike', '%' . $branchName . '%')->first();
            if (!$branch) {
                $rowErrors[] = ['column' => 10, 'message' => "Branch '$branchName' not found."];
            }
        }

        return [
            'index' => $rowCount,
            'data' => $data,
            'errors' => $rowErrors,
            'is_valid' => count($rowErrors) === 0
        ];
    }
}
