<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\LoyaltySaleData;
use App\Models\MetalMaster;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\LoyaltyLedger;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\Branch;

class LoyaltySaleImportController extends Controller
{
    protected $customerService;

    public function __construct(\App\Services\CustomerService $customerService)
    {
        $this->customerService = $customerService;
    }

    /**
     * Validate multiple rows of data.
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
     * Import multiple rows of data from preview (handles edits).
     */
    public function importRows(Request $request)
    {
        $request->validate([
            'rows' => 'required|array',
            'batch_id' => 'nullable|string'
        ]);

        $rows = $request->input('rows');
        $batchId = $request->input('batch_id') ?? (string) \Illuminate\Support\Str::uuid();
        
        $processedCount = 0;
        $failedCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $data = $row['data'] ?? $row; 
            $rowCount = ($row['index'] ?? ($index + 1));

            try {
                $isGstMissing = false;
                $val8 = str_replace(',', '', trim($data[8] ?? ''));
                if (count($data) == 12 && !is_numeric($val8) && !empty($val8)) {
                    $isGstMissing = true;
                }

                $rowData = [
                    'vou_date' => trim($data[0] ?? ''),
                    'vou_no' => trim($data[1] ?? ''),
                    'mobile_no' => trim($data[2] ?? ''),
                    'party_name' => trim($data[3] ?? ''),
                    'metal_name' => trim($data[4] ?? ''),
                    'carat' => trim($data[5] ?? ''),
                    'net_wt' => str_replace(',', '', trim($data[6] ?? '0')),
                    'total_amt' => str_replace(',', '', trim($data[7] ?? '0')),
                    'gst_taxable_amt' => $isGstMissing ? 0 : str_replace(',', '', trim($data[8] ?? '0')),
                    'salesman_name' => $isGstMissing ? trim($data[8] ?? '') : trim($data[9] ?? ''),
                    'branch_name' => $isGstMissing ? trim($data[9] ?? '') : trim($data[10] ?? ''),
                    'loyalty_card_no' => $isGstMissing ? trim($data[10] ?? '') : trim($data[11] ?? ''),
                    'introducer' => $isGstMissing ? trim($data[11] ?? '') : trim($data[12] ?? ''),
                    'import_batch_id' => $batchId,
                    'status' => 'Pending',
                ];

                if (!empty($rowData['salesman_name'])) {
                    $salesman = \App\Models\User::whereHas('roles', function($q) { $q->where('name', 'ilike', 'staff'); })
                        ->where('name', 'ilike', '%' . $rowData['salesman_name'] . '%')->first();
                    if ($salesman) $rowData['salesman_id'] = $salesman->id;
                }

                if (!empty($rowData['branch_name'])) {
                    $branch = \App\Models\Branch::where('name', 'ilike', '%' . $rowData['branch_name'] . '%')->first();
                    if ($branch) $rowData['branch_id'] = $branch->id;
                }

                // 1. Date formatting for DB
                try {
                    $cleanDate = str_replace('/', '-', $rowData['vou_date']);
                    $date = \Carbon\Carbon::createFromFormat('d-m-Y', $cleanDate);
                    $rowData['vou_date'] = $date->format('Y-m-d');
                } catch (\Exception $e) {
                    throw new \Exception("Invalid date format: " . $rowData['vou_date']);
                }

                // 2. Vou. No Uniqueness
                if (LoyaltySaleData::where('vou_no', $rowData['vou_no'])->exists()) {
                    throw new \Exception("Duplicate Voucher Number: " . $rowData['vou_no']);
                }

                // 3. Mobile No (10-digit)
                if (!preg_match('/^[0-9]{10}$/', $rowData['mobile_no'])) {
                    throw new \Exception("Invalid Mobile Number: " . $rowData['mobile_no'] . ". Must be 10 digits.");
                }

                // Customer Lookup
                $customer = null;
                if (!empty($rowData['loyalty_card_no'])) {
                    $customer = \App\Models\Customer::where('loyalty_card_no', $rowData['loyalty_card_no'])->first();
                }
                if (!$customer && !empty($rowData['mobile_no'])) {
                    $customer = \App\Models\Customer::where('mobile', $rowData['mobile_no'])->first();
                }
                if ($customer) $rowData['customer_id'] = $customer->id;

                \App\Models\LoyaltySaleData::create($rowData);
                $processedCount++;

            } catch (\Exception $e) {
                $failedCount++;
                $errors[] = "Row $rowCount: " . $e->getMessage();
                try {
                    if (!empty($rowData['vou_no'])) {
                        $rowData['status'] = 'Failed';
                        $rowData['error_message'] = $e->getMessage();
                        if (empty($rowData['vou_date'])) $rowData['vou_date'] = now()->format('Y-m-d');
                        \App\Models\LoyaltySaleData::create($rowData);
                    }
                } catch (\Exception $inner) {}
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Import completed',
            'processed_rows' => $processedCount,
            'failed_rows' => $failedCount,
            'batch_id' => $batchId,
            'errors' => $errors
        ]);
    }

    /**
     * Internal logic for validating a row.
     */
    protected function validateRowData(array $data, int $rowCount): array
    {
        $rowErrors = [];
        
        // Check for column count (12 or 13)
        if (count($data) < 12) {
            $rowErrors[] = ['column' => -1, 'message' => 'Invalid column count. Expected at least 12 columns. Found ' . count($data)];
            return [
                'index' => $rowCount,
                'data' => $data,
                'errors' => $rowErrors,
                'is_valid' => false
            ];
        }

        // Logic to handle optional GST Taxable Amt column
        $isGstMissing = false;
        $val8 = str_replace(',', '', trim($data[8] ?? ''));
        if (count($data) == 12 && !is_numeric($val8) && !empty($val8)) {
            $isGstMissing = true;
        }

        // 1. Vou. Date Validation
        $vouDate = trim($data[0] ?? '');
        try {
            if (empty($vouDate)) throw new \Exception("Date is required");
            $cleanDate = str_replace('/', '-', $vouDate);
            Carbon::createFromFormat('d-m-Y', $cleanDate);
        } catch (\Exception $e) {
            $rowErrors[] = ['column' => 0, 'message' => "Invalid date format: $vouDate. Expected DD-MM-YYYY."];
        }

        // 2. Vou. No Uniqueness
        $vouNo = trim($data[1] ?? '');
        if (empty($vouNo)) {
            $rowErrors[] = ['column' => 1, 'message' => "Voucher Number is required."];
        } else {
            if (LoyaltySaleData::where('vou_no', $vouNo)->exists()) {
                $rowErrors[] = ['column' => 1, 'message' => "Duplicate Voucher Number: $vouNo. Already exists in system."];
            }
        }

        // 3. Mobile No (10-digit)
        $mobile = trim($data[2] ?? '');
        if (empty($mobile)) {
            $rowErrors[] = ['column' => 2, 'message' => "Mobile Number is required."];
        } else if (!preg_match('/^[0-9]{10}$/', $mobile)) {
            $rowErrors[] = ['column' => 2, 'message' => "Mobile Number must be 10 digits."];
        }

        // 4. Metal Lookup
        $metalName = trim($data[4] ?? '');
        if (empty($metalName)) {
            $rowErrors[] = ['column' => 4, 'message' => "Metal Name is required."];
        } else {
            $metal = MetalMaster::where('metal_name', 'ilike', '%' . $metalName . '%')->first();
            if (!$metal) {
                // Try digital metal master
                $digitalMetal = \App\Models\DigitalMetalMaster::where('metal_name', 'ilike', '%' . $metalName . '%')->first();
                if (!$digitalMetal) {
                    $rowErrors[] = ['column' => 4, 'message' => "Metal '$metalName' not found in Metal Master."];
                }
            }
        }

        // 10. Salesman Lookup (Using the Staff role check)
        $salesmanName = $isGstMissing ? trim($data[8] ?? '') : trim($data[9] ?? '');
        if (!empty($salesmanName)) {
            $salesman = \App\Models\User::whereHas('roles', function($q) {
                $q->where('name', 'ilike', 'staff');
            })->where('name', 'ilike', '%' . $salesmanName . '%')->first();
            
            if (!$salesman) {
                $colIndex = $isGstMissing ? 8 : 9;
                $rowErrors[] = ['column' => $colIndex, 'message' => "Salesman '$salesmanName' not found in Staff list."];
            }
        }

        // 11. Branch Lookup
        $branchName = $isGstMissing ? trim($data[9] ?? '') : trim($data[10] ?? '');
        if (!empty($branchName)) {
            $branch = \App\Models\Branch::where('name', 'ilike', '%' . $branchName . '%')->first();
            if (!$branch) {
                $colIndex = $isGstMissing ? 9 : 10;
                $rowErrors[] = ['column' => $colIndex, 'message' => "Branch '$branchName' not found."];
            }
        }

        return [
            'index' => $rowCount,
            'data' => $data,
            'errors' => $rowErrors,
            'is_valid' => count($rowErrors) === 0
        ];
    }

    /**
     * Validate the uploaded file and return errors per row/column.
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
     * Handle the file upload and initial validation/storage.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $batchId = (string) Str::uuid();

        // Basic CSV parsing using fgetcsv
        // For Excel (.xlsx, .xls) support, we would ideally use Maatwebsite/Excel
        // but since it's not installed, we'll assume CSV for this implementation.
        // If it's Excel, the user will need to export to CSV first or we install the package.
        
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle); // Read header row

        $rowCount = 0;
        $processedCount = 0;
        $errors = [];

        while (($data = fgetcsv($handle)) !== false) {
            $rowCount++;
            
            // Check for minimum column count (12) - Introducer is optional
            if (count($data) < 12) {
                $errors[] = "Row $rowCount: Invalid column count. Expected at least 12 columns.";
                continue;
            }

            // Logic to handle optional GST Taxable Amt column
            $isGstMissing = false;
            $val8 = str_replace(',', '', trim($data[8] ?? ''));
            if (count($data) == 12 && !is_numeric($val8) && !empty($val8)) {
                $isGstMissing = true;
            }

            $rowData = [
                'vou_date' => trim($data[0]),
                'vou_no' => trim($data[1]),
                'mobile_no' => trim($data[2]),
                'party_name' => trim($data[3]),
                'metal_name' => trim($data[4]),
                'carat' => trim($data[5]),
                'net_wt' => str_replace(',', '', trim($data[6])),
                'total_amt' => str_replace(',', '', trim($data[7])),
                'gst_taxable_amt' => $isGstMissing ? 0 : str_replace(',', '', trim($data[8] ?? '0')),
                'salesman_name' => $isGstMissing ? trim($data[8] ?? '') : trim($data[9] ?? ''),
                'branch_name' => $isGstMissing ? trim($data[9] ?? '') : trim($data[10] ?? ''),
                'loyalty_card_no' => $isGstMissing ? trim($data[10] ?? '') : trim($data[11] ?? ''),
                'introducer' => $isGstMissing ? trim($data[11] ?? '') : trim($data[12] ?? ''),
                'import_batch_id' => $batchId,
                'status' => 'Pending',
            ];

            // Resolve IDs early so they are preserved even if validation fails
            if (!empty($rowData['salesman_name'])) {
                // Look for a user with the 'staff' role (case-insensitive check)
                $salesman = \App\Models\User::whereHas('roles', function($q) {
                    $q->where('name', 'ilike', 'staff');
                })
                ->where('name', 'ilike', '%' . $rowData['salesman_name'] . '%')
                ->first();
                if ($salesman) {
                    $rowData['salesman_id'] = $salesman->id;
                }
            }

            if (!empty($rowData['branch_name'])) {
                $branch = \App\Models\Branch::where('name', 'ilike', '%' . $rowData['branch_name'] . '%')->first();
                if ($branch) {
                    $rowData['branch_id'] = $branch->id;
                }
            }

            try {
                // 1. Vou. Date Validation (DD-MM-YYYY or DD/MM/YYYY)
                try {
                    $cleanDate = str_replace('/', '-', $rowData['vou_date']);
                    $date = Carbon::createFromFormat('d-m-Y', $cleanDate);
                    $rowData['vou_date'] = $date->format('Y-m-d');
                } catch (\Exception $e) {
                    throw new \Exception("Invalid date format: " . $rowData['vou_date'] . ". Expected DD-MM-YYYY or DD/MM/YYYY.");
                }

                // 2. Vou. No Uniqueness
                if (LoyaltySaleData::where('vou_no', $rowData['vou_no'])->exists()) {
                    throw new \Exception("Duplicate Voucher Number: " . $rowData['vou_no']);
                }

                // 3. Mobile No (10-digit)
                if (!preg_match('/^[0-9]{10}$/', $rowData['mobile_no'])) {
                    throw new \Exception("Invalid Mobile Number: " . $rowData['mobile_no'] . ". Must be 10 digits.");
                }

                // Customer Lookup
                $customer = null;
                if (!empty($rowData['loyalty_card_no'])) {
                    $customer = \App\Models\Customer::where('loyalty_card_no', $rowData['loyalty_card_no'])->first();
                }
                if (!$customer && !empty($rowData['mobile_no'])) {
                    $customer = \App\Models\Customer::where('mobile', $rowData['mobile_no'])->first();
                }

                if ($customer) {
                    $rowData['customer_id'] = $customer->id;
                }

                LoyaltySaleData::create($rowData);
                $processedCount++;

            } catch (\Exception $e) {
                $errors[] = "Row $rowCount (" . $rowData['vou_no'] . "): " . $e->getMessage();
                
                // Store failed records for review
                $rowData['status'] = 'Failed';
                $rowData['error_message'] = $e->getMessage();
                
                // Ensure date is valid for DB insertion if it failed parsing
                if (strpos($e->getMessage(), 'Invalid date format') !== false) {
                    $rowData['vou_date'] = Carbon::now()->format('Y-m-d'); // Temporary fallback
                }
                
                LoyaltySaleData::create($rowData);
            }
        }

        fclose($handle);

        return response()->json([
            'success' => true,
            'batch_id' => $batchId,
            'total_rows' => $rowCount,
            'processed_rows' => $processedCount,
            'failed_rows' => count($errors),
            'errors' => $errors,
        ]);
    }

    /**
     * Process the imported data: create customers and post transactions to the loyalty ledger.
     */
    public function process(Request $request)
    {
        $batchId = $request->input('batch_id');
        $recordIds = $request->input('record_ids', []); // New support for selective processing

        $query = LoyaltySaleData::where('status', 'Pending');
        
        if (!empty($recordIds)) {
            $query->whereIn('id', $recordIds);
        } else {
            $query->where('import_batch_id', $batchId);
        }

        $pendingData = $query->get();

        $processedCount = 0;
        $failedCount = 0;

        // Get active loyalty setup
        $setup = \App\Models\LoyaltySetup::where('status', 'Active')
            ->where(function ($q) {
                $now = now()->format('Y-m-d');
                $q->whereNull('from_date')->orWhere('from_date', '<=', $now);
            })
            ->where(function ($q) {
                $now = now()->format('Y-m-d');
                $q->whereNull('to_date')->orWhere('to_date', '>=', $now);
            })
            ->first();

        foreach ($pendingData as $data) {
            DB::beginTransaction();
            try {
                // 1. Auto-create customer if not found
                $customer = null;
                if (!empty($data->loyalty_card_no)) {
                    $customer = Customer::where('loyalty_card_no', $data->loyalty_card_no)->first();
                }
                if (!$customer) {
                    $cleanMobile = preg_replace('/[^0-9]/', '', $data->mobile_no);
                    if (strlen($cleanMobile) > 10) $cleanMobile = substr($cleanMobile, -10);
                    $customer = Customer::where('mobile', $cleanMobile)->first();
                }
                
                if ($customer) {
                    // Update existing customer branch if provided
                    if (!empty($data->branch_id)) {
                        $this->customerService->syncCustomerUser($customer, ['branch_id' => $data->branch_id]);
                    }
                } else {
                    $customer = $this->customerService->create([
                        'name' => $data->party_name,
                        'mobile' => $data->mobile_no,
                        'status' => 'active',
                        'join_date' => $data->vou_date,
                        'loyalty_card_no' => !empty($data->loyalty_card_no) ? $data->loyalty_card_no : $this->customerService->generateUniqueLoyaltyCardNo(),
                        'introducer_card_no' => $data->introducer,
                        'branch_id' => $data->branch_id, // Pass branch_id for syncing
                    ]);
                }
                
                $data->customer_id = $customer->id;

                // Auto-overwrite existing customer details if they have changed (Sync with Import)
                $isUpdated = false;
                if (!empty($data->mobile_no)) {
                    $cleanMobile = preg_replace('/[^0-9]/', '', $data->mobile_no);
                    if (strlen($cleanMobile) > 10) $cleanMobile = substr($cleanMobile, -10);
                    if ($customer->mobile !== $cleanMobile) {
                        // Check if new mobile is already taken by ANOTHER customer to avoid unique constraint error
                        $exists = Customer::where('mobile', $cleanMobile)->where('id', '!=', $customer->id)->exists();
                        if (!$exists) {
                            $customer->mobile = $cleanMobile;
                            $isUpdated = true;
                        }
                    }
                }
                
                if (!empty($data->party_name) && $customer->name !== $data->party_name) {
                    $customer->name = $data->party_name;
                    $isUpdated = true;
                }

                if (!empty($data->introducer) && $customer->introducer_card_no !== $data->introducer) {
                    $customer->introducer_card_no = $data->introducer;
                    $isUpdated = true;
                }

                if ($isUpdated) {
                    $customer->save();
                }

                // 2. Calculate Points
                $earnedPoints = 0;
                if ($setup && $setup->enable_loyalty_program && $setup->allow_earn_points) {
                    $earnedPoints = $this->calculatePoints($data, $setup);
                }

                // 3. Create Ledger Entry
                // Check if entry already exists to prevent duplication as requested
                $exists = \App\Models\LoyaltyLedger::where('reference_id', $data->vou_no)
                    ->where('reference_type', 'Import')
                    ->where('customer_id', $customer->id)
                    ->exists();

                if (!$exists) {
                    \App\Models\LoyaltyLedger::create([
                        'customer_id' => $customer->id,
                        'transaction_type' => 'Credit',
                        'points' => $earnedPoints,
                        'description' => "Imported Sale: " . $data->vou_no,
                        'reference_id' => $data->vou_no,
                        'reference_type' => 'Import',
                        'transaction_date' => $data->vou_date,
                    ]);

                    // 4. Update Customer Balance
                    $customer->increment('loyalty_points_balance', $earnedPoints);
                    $customer->increment('lifetime_points', $earnedPoints);

                    // 5. Update Customer Category/Level and check for gifts
                    $customer->checkAndApplyLoyaltyUpgrade();

                    // 6. Award Introducer Points if applicable
                    if ($setup && $setup->allow_introducer_points && !empty($customer->introducer_card_no)) {
                        $this->processIntroducerReward($customer, $data, $setup);
                    }
                }

                // 5. Mark as processed
                $data->status = 'Processed';
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
            'message' => "Successfully processed $processedCount records. $failedCount failed.",
            'processed' => $processedCount,
            'failed' => $failedCount,
        ]);
    }

    /**
     * Calculate points based on setup rules.
     */
    private function calculatePoints($data, $setup)
    {
        $points = 0;
        $basis = $setup->point_calculation_on; // 'Net Amount', 'Gross Amount', 'Net Weight'
        $roundingMethod = $setup->rounding_method ?? 'Round Down';
        
        $amountToCalculateOn = 0;
        $weightToCalculateOn = (float)$data->net_wt;

        if ($basis === 'Gross Amount') {
            $amountToCalculateOn = (float)$data->total_amt;
        } else {
            // Default to Net Amount (Taxable Amount)
            $amountToCalculateOn = (float)$data->gst_taxable_amt;
        }

        // 1. Try Group Wise Points Setup first
        $groupWiseRules = $setup->group_wise_points_setup ?? [];
        if (!empty($groupWiseRules)) {
            // Find metal to get erp_metal_id (Check both masters, considering carat/purity)
            $metal = MetalMaster::where('metal_name', 'ilike', '%' . $data->metal_name . '%')
                ->where(function($q) use ($data) {
                    if (!empty($data->carat)) {
                        $q->where('display_text', 'ilike', '%' . $data->carat . '%');
                    }
                })->first();

            if (!$metal) {
                $metal = \App\Models\DigitalMetalMaster::where('metal_name', 'ilike', '%' . $data->metal_name . '%')
                    ->where(function($q) use ($data) {
                        if (!empty($data->carat)) {
                            $q->where('purity', 'ilike', '%' . $data->carat . '%')
                              ->orWhere('display_text', 'ilike', '%' . $data->carat . '%');
                        }
                    })->first();
            }
            
            if ($metal) {
                foreach ($groupWiseRules as $rule) {
                    if ($rule['group_code'] == $metal->erp_metal_id && ($rule['status'] ?? 'Active') === 'Active') {
                        $calcBasis = $rule['calculation_basis'] ?? 'Amount';
                        $groupPoints = 0;
                        
                        // Handle Amount part of group rule
                        if ($calcBasis === 'Amount' || $calcBasis === 'Both') {
                            $from = $rule['from_amount'] ?? 0;
                            $to = $rule['to_amount'] ?? 0;
                            if ($amountToCalculateOn >= $from && ($to == 0 || $amountToCalculateOn <= $to)) {
                                $forEvery = $rule['points_for_every_amt'] ?? 0;
                                $toBeEarned = $rule['points_to_be_earned_amt'] ?? 0;
                                if ($forEvery > 0) {
                                    // Formula: (Amount / Every) * Earned
                                    $rawPoints = ($amountToCalculateOn / $forEvery) * $toBeEarned;
                                    $groupPoints += $this->applyRounding($rawPoints, $roundingMethod);
                                }
                            }
                        }
                        
                        // Handle Weight part of group rule
                        if ($calcBasis === 'Weight' || $calcBasis === 'Both') {
                            $from = $rule['from_weight'] ?? 0;
                            $to = $rule['to_weight'] ?? 0;
                            if ($weightToCalculateOn >= $from && ($to == 0 || $weightToCalculateOn <= $to)) {
                                $forEvery = $rule['points_for_every_wt'] ?? 0;
                                $toBeEarned = $rule['points_to_be_earned_wt'] ?? 0;
                                if ($forEvery > 0) {
                                    // Formula: (Weight / Every) * Earned
                                    $rawPoints = ($weightToCalculateOn / $forEvery) * $toBeEarned;
                                    $groupPoints += $this->applyRounding($rawPoints, $roundingMethod);
                                }
                            }
                        }
                        
                        if ($groupPoints > 0) return $groupPoints;
                    }
                }
            }
        }

        // 2. Fallback to Overall Rules
        $valueToCalculateOn = ($basis === 'Net Weight') ? $weightToCalculateOn : $amountToCalculateOn;
        
        // Special case for Net Weight if global weight settings are used
        if ($basis === 'Net Weight' && ($setup->points_for_every_wt_global ?? 0) > 0) {
            // Formula: (Weight / Every) * Earned
            $rawPoints = ($weightToCalculateOn / $setup->points_for_every_wt_global) * ($setup->points_to_be_earned_wt_global ?? 0);
            return $this->applyRounding($rawPoints, $roundingMethod);
        }

        $overallRules = $setup->points_setup_overall ?? [];
        foreach ($overallRules as $rule) {
            if (($rule['status'] ?? 'Active') !== 'Active') continue;
            
            $from = $rule['from_amount'] ?? 0;
            $to = $rule['to_amount'] ?? 0;
            
            if ($valueToCalculateOn >= $from && ($to == 0 || $valueToCalculateOn <= $to)) {
                $forEvery = $rule['points_for_every'] ?? 1;
                $toBeEarned = $rule['points_to_be_earned'] ?? 0;
                
                if ($forEvery > 0) {
                    // Formula: (Value / Every) * Earned
                    $rawPoints = ($valueToCalculateOn / $forEvery) * $toBeEarned;
                    $points = $this->applyRounding($rawPoints, $roundingMethod);
                    
                    // Min/Max validation
                    $min = $rule['min_points_to_earn'] ?? 0;
                    $max = $rule['max_points_to_earn'] ?? 0;
                    if ($min > 0 && $points < $min) $points = $min;
                    if ($max > 0 && $points > $max) $points = $max;
                }
                break;
            }
        }

        return $points;
    }

    /**
     * Apply rounding method to calculated points.
     */
    private function applyRounding($points, $method)
    {
        switch ($method) {
            case 'Round Up':
                return ceil($points);
            case 'Nearest':
                return round($points);
            case 'Round Down':
            default:
                return floor($points);
        }
    }

    /**
     * Get a list of recent batches.
     */
    public function batches(Request $request)
    {
        $query = LoyaltySaleData::select('import_batch_id', DB::raw('count(*) as total'), DB::raw('max(created_at) as date'));
        
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
        $details = LoyaltySaleData::where('import_batch_id', $batchId)->get();

        return response()->json([
            'success' => true,
            'data' => $details,
        ]);
    }

    public function deleteBatch($batchId)
    {
        return DB::transaction(function () use ($batchId) {
            $records = LoyaltySaleData::where('import_batch_id', $batchId)->get();
            $count = $records->count();

            if ($count > 0) {
                $impact = $this->revertLedgerImpact($records);
                
                LoyaltySaleData::where('import_batch_id', $batchId)->delete();

                \App\Models\ActivityLog::create([
                    'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
                    'module' => 'Loyalty Management',
                    'sub_module' => 'Sale Data Import',
                    'action' => 'Delete Batch',
                    'description' => "Deleted $count records from import batch {$batchId}. Deleted {$impact['ledger_count']} ledger entries and reversed {$impact['points_reverted']} points.",
                    'metadata' => [
                        'batch_id' => $batchId, 
                        'deleted_count' => $count,
                        'ledger_entries_deleted' => $impact['ledger_count'],
                        'points_reverted' => $impact['points_reverted']
                    ]
                ]);
            }

            return response()->json([
                'success' => true, 
                'message' => "Successfully deleted $count records from batch.",
                'fully_deleted' => true
            ]);
        });
    }

    public function deleteRecord($id)
    {
        return DB::transaction(function () use ($id) {
            $record = LoyaltySaleData::findOrFail($id);
            $batchId = $record->import_batch_id;
            $vouNo = $record->vou_no;

            $impact = $this->revertLedgerImpact([$record]);
            $record->delete();

            \App\Models\ActivityLog::create([
                'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
                'module' => 'Loyalty Management',
                'sub_module' => 'Sale Data Import',
                'action' => 'Delete Record',
                'description' => "Deleted import record for {$vouNo}. Deleted {$impact['ledger_count']} ledger entries and reversed {$impact['points_reverted']} points.",
                'metadata' => [
                    'record_id' => $id, 
                    'vou_no' => $vouNo,
                    'ledger_entries_deleted' => $impact['ledger_count'],
                    'points_reverted' => $impact['points_reverted']
                ]
            ]);

            $totalLeft = LoyaltySaleData::where('import_batch_id', $batchId)->count();

            return response()->json([
                'success' => true, 
                'message' => 'Successfully deleted record.',
                'fully_deleted' => $totalLeft === 0
            ]);
        });
    }

    public function bulkDeleteRecords(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) return response()->json(['success' => false, 'message' => 'No records selected'], 400);

        return DB::transaction(function () use ($ids) {
            $records = LoyaltySaleData::whereIn('id', $ids)->get();
            if ($records->isEmpty()) return response()->json(['success' => false, 'message' => 'No valid records found'], 404);

            $batchId = $records->first()->import_batch_id;
            $count = $records->count();

            $impact = $this->revertLedgerImpact($records);
            LoyaltySaleData::whereIn('id', $ids)->delete();

            \App\Models\ActivityLog::create([
                'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
                'module' => 'Loyalty Management',
                'sub_module' => 'Sale Data Import',
                'action' => 'Delete Bulk',
                'description' => "Deleted $count records in bulk (Batch: {$batchId}). Deleted {$impact['ledger_count']} ledger entries and reversed {$impact['points_reverted']} points.",
                'metadata' => [
                    'deleted_ids' => $ids,
                    'ledger_entries_deleted' => $impact['ledger_count'],
                    'points_reverted' => $impact['points_reverted']
                ]
            ]);

            $totalLeft = LoyaltySaleData::where('import_batch_id', $batchId)->count();

            return response()->json([
                'success' => true,
                'message' => "Successfully deleted $count records.",
                'fully_deleted' => $totalLeft === 0
            ]);
        });
    }

    public function updateRecord(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $record = LoyaltySaleData::findOrFail($id);
            
            $validated = $request->validate([
                'vou_date' => 'required|date',
                'vou_no' => 'required|string',
                'mobile_no' => 'required|string|size:10',
                'party_name' => 'required|string',
                'metal_name' => 'required|string',
                'carat' => 'required|string',
                'net_wt' => 'required|numeric',
                'total_amt' => 'required|numeric',
                'gst_taxable_amt' => 'required|numeric',
                'salesman_name' => 'required|string',
                'branch_name' => 'nullable|string',
                'loyalty_card_no' => 'nullable|string',
                'introducer' => 'nullable|string',
            ]);

            $impacted = false;
            $impact = ['ledger_count' => 0, 'points_reverted' => 0];

            // If it was already processed, revert the ledger impact before updating
            if ($record->status === 'Processed') {
                $impact = $this->revertLedgerImpact([$record]);
                $impacted = true;
            }

            $finalData = array_merge($validated, ['status' => 'Pending', 'error_message' => null]);

            // 10. Salesman Lookup (Resolve ID if name provided)
            // Look for a user with the 'staff' role (case-insensitive check)
            $salesman = \App\Models\User::whereHas('roles', function($q) {
                $q->where('name', 'ilike', 'staff');
            })
            ->where('name', 'ilike', '%' . ($validated['salesman_name'] ?? '') . '%')
            ->first();
            if ($salesman) {
                $finalData['salesman_id'] = $salesman->id;
            } else {
                $finalData['salesman_id'] = null;
            }

            // Branch Lookup (Resolve ID if name provided)
            if (!empty($validated['branch_name'])) {
                $branch = \App\Models\Branch::where('name', 'ilike', '%' . $validated['branch_name'] . '%')->first();
                if ($branch) {
                    $finalData['branch_id'] = $branch->id;
                } else {
                    $finalData['branch_id'] = null;
                }
            }

            $record->update($finalData);

            \App\Models\ActivityLog::create([
                'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
                'module' => 'Loyalty Management',
                'sub_module' => 'Sale Data Import',
                'action' => 'Update Record',
                'description' => "Updated import record {$record->vou_no}." . ($impacted ? " Deleted {$impact['ledger_count']} ledger entries and reversed {$impact['points_reverted']} points as it was previously processed." : ""),
                'metadata' => [
                    'record_id' => $id, 
                    'new_data' => $validated,
                    'ledger_entries_deleted' => $impact['ledger_count'],
                    'points_reverted' => $impact['points_reverted']
                ]
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Record updated successfully.',
                'data' => $record
            ]);
        });
    }

    public function recordLogs($id)
    {
        $record = LoyaltySaleData::findOrFail($id);

        $logs = \App\Models\ActivityLog::where('sub_module', 'Sale Data Import')
            ->where(function($q) use ($id, $record) {
                $q->where('metadata->record_id', $id)
                  ->orWhere('metadata->vou_no', $record->vou_no);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'record' => $record,
            'logs' => $logs
        ]);
    }

    /**
     * Revert loyalty ledger entries for the given import records.
     */
    private function revertLedgerImpact($records)
    {
        $impactedLedgerCount = 0;
        $totalPointsReverted = 0;

        foreach ($records as $record) {
            if ($record->status === 'Processed') {
                // Find ledger entry for this record
                // We use vou_no, customer_id and 'Import' type to be precise
                $ledgerEntries = LoyaltyLedger::where('reference_id', $record->vou_no)
                    ->where('reference_type', 'Import')
                    ->where('customer_id', $record->customer_id)
                    ->get();

                foreach ($ledgerEntries as $ledger) {
                    $customer = Customer::find($ledger->customer_id);
                    if ($customer) {
                        if ($ledger->transaction_type === 'Credit') {
                            $customer->decrement('loyalty_points_balance', $ledger->points);
                            $customer->decrement('lifetime_points', $ledger->points);
                        } else {
                            $customer->increment('loyalty_points_balance', $ledger->points);
                        }
                    }
                    $totalPointsReverted += $ledger->points;
                    $ledger->delete();
                    $impactedLedgerCount++;
                }
            }
        }
        
        return [
            'ledger_count' => $impactedLedgerCount,
            'points_reverted' => $totalPointsReverted
        ];
    }

    /**
     * Award rewards to the introducer based on setup rules.
     */
    private function processIntroducerReward($customer, $data, $setup)
    {
        $introducer = Customer::where('loyalty_card_no', $customer->introducer_card_no)->first();
        if (!$introducer) return;

        // One-time reward check: Has this introducer already been rewarded for this specific customer?
        $alreadyRewarded = \App\Models\LoyaltyLedger::where('customer_id', $introducer->id)
            ->where('reference_type', 'Introducer Reward')
            ->where('description', 'like', '%' . $customer->loyalty_card_no . '%')
            ->exists();
            
        if ($alreadyRewarded) return;

        $introducerPoints = $introducer->loyalty_points_balance;
        $introducedCategory = $customer->category;

        // Find matching benefit line from setup
        $benefitLine = null;
        $setupLines = $setup->introducer_benefit_setup ?? [];
        
        foreach ($setupLines as $line) {
            if (($line['status'] ?? 'Active') !== 'Active') continue;
            
            $matchPoints = ($introducerPoints >= ($line['from_points'] ?? 0) && $introducerPoints <= ($line['to_points'] ?? 9999999));
            $matchCategory = empty($line['card_category']) || $line['card_category'] === $introducedCategory;
            
            if ($matchPoints && $matchCategory) {
                $benefitLine = $line;
                break;
            }
        }

        if ($benefitLine) {
            $rewardPoints = 0;
            if (($benefitLine['benefit_type'] ?? 'Value') === 'Value') {
                $rewardPoints = $benefitLine['benefit_points'] ?? 0;
            } else {
                // Percentage of the points earned by the introduced customer in this transaction
                $introducedEarnedPoints = $this->calculatePoints($data, $setup);
                $rewardPoints = ($introducedEarnedPoints * ($benefitLine['benefit_points'] ?? 0)) / 100;
            }

            if ($rewardPoints > 0) {
                \App\Models\LoyaltyLedger::create([
                    'customer_id' => $introducer->id,
                    'transaction_type' => 'Credit',
                    'points' => $rewardPoints,
                    'description' => "Introducer Reward for " . $customer->name . " (Card: " . $customer->loyalty_card_no . ")",
                    'reference_id' => $data->vou_no,
                    'reference_type' => 'Introducer Reward',
                    'transaction_date' => $data->vou_date,
                ]);

                $introducer->increment('loyalty_points_balance', $rewardPoints);
                $introducer->increment('lifetime_points', $rewardPoints);

                // Update Introducer Category/Level and check for gifts
                $introducer->checkAndApplyLoyaltyUpgrade();
            }
            
            // Log gift if applicable
            if (!empty($benefitLine['reward_gift']) && !empty($benefitLine['gift_name'])) {
                Log::info("Introducer Reward: Customer {$introducer->loyalty_card_no} earned gift '{$benefitLine['gift_name']}' for introducing {$customer->loyalty_card_no}");
            }
        }
    }

}
