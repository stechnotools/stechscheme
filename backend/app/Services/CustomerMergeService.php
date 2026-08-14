<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\CustomerKyc;
use App\Models\CustomerMerge;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Combines two Customer records confirmed by staff to be the same person
 * (e.g. enrolled twice under two different mobile numbers). The surviving
 * ("primary") record keeps its own mobile and absorbs the duplicate's
 * mobile into `alternate_mobile`, every subscription/related record the
 * duplicate owned is reassigned to it, and the duplicate row is soft-deleted
 * (not destroyed) — every merge produces a CustomerMerge audit row that
 * undo() can use to reverse it exactly.
 *
 * Not to be confused with two different people who happen to share one
 * mobile number (household/family) — that's a legitimate, separate case
 * handled by Customer::forMobile() returning multiple rows, not a merge.
 */
class CustomerMergeService
{
    /**
     * Every table with a customer_id column whose rows must move from the
     * duplicate to the primary customer. customer_kycs is handled
     * separately below since it's conceptually one-per-customer.
     */
    private const REASSIGN_TABLES = [
        'memberships',
        'customer_feedback',
        'digital_metal_sales',
        'digital_metal_purchases',
        'loyalty_sale_data',
        'loyalty_ledgers',
        'receipts',
        'customer_support_messages',
        'scheme_join_requests',
        'gold_rate_alerts',
        'appointments',
        'pending_payments',
        'scheme_openings',
        'salesman_commissions',
    ];

    public function merge(Customer $primary, Customer $duplicate): Customer
    {
        if ($primary->id === $duplicate->id) {
            throw new RuntimeException('Cannot merge a customer into itself.');
        }

        return DB::transaction(function () use ($primary, $duplicate) {
            // Lock both rows for the duration of the merge so a concurrent
            // enrollment/edit can't interleave with the reassignment below.
            $primary = Customer::query()->whereKey($primary->id)->lockForUpdate()->firstOrFail();
            $duplicate = Customer::query()->whereKey($duplicate->id)->lockForUpdate()->firstOrFail();

            $duplicateName = $duplicate->name;
            $duplicateMobile = $duplicate->mobile;

            $alternateMobileSet = $this->absorbMobile($primary, $duplicate);
            $kycOutcome = $this->mergeKyc($primary, $duplicate);

            $movedRecords = [];
            foreach (self::REASSIGN_TABLES as $table) {
                $ids = DB::table($table)->where('customer_id', $duplicate->id)->pluck('id');

                if ($ids->isEmpty()) {
                    continue;
                }

                foreach ($ids as $id) {
                    $movedRecords[] = ['table' => $table, 'id' => $id];
                }

                DB::table($table)->whereIn('id', $ids)->update(['customer_id' => $primary->id]);
            }

            $duplicateId = $duplicate->id;
            $duplicate->delete(); // soft delete — see CustomerKyc/Customer SoftDeletes

            $customerMerge = CustomerMerge::create([
                'primary_customer_id' => $primary->id,
                'duplicate_customer_id' => $duplicateId,
                'merged_by_user_id' => Auth::id(),
                'duplicate_name' => $duplicateName,
                'duplicate_mobile' => $duplicateMobile,
                'moved_records' => $movedRecords,
                'kyc_backfilled_fields' => $kycOutcome['backfilled_fields'] ?: null,
                'kyc_reassigned' => $kycOutcome['reassigned'],
                'duplicate_kyc_id' => $kycOutcome['duplicate_kyc_id'],
                'alternate_mobile_set' => $alternateMobileSet,
            ]);

            ActivityLog::create([
                'user_id' => Auth::id() ?? 1,
                'module' => 'Customers',
                'sub_module' => 'Merge',
                'action' => 'Update',
                'description' => "Merged customer #{$duplicateId} ({$duplicateName}) into #{$primary->id} ({$primary->name}). Undo via merge record #{$customerMerge->id}.",
                'metadata' => [
                    'customer_merge_id' => $customerMerge->id,
                    'primary_customer_id' => $primary->id,
                    'duplicate_customer_id' => $duplicateId,
                    'duplicate_name' => $duplicateName,
                    'mobile_absorbed' => $duplicateMobile,
                ],
            ]);

            return $primary->fresh(['kyc', 'user', 'memberships']);
        });
    }

    /**
     * Reverse a merge exactly: restores the duplicate customer (and its KYC
     * row, if one was touched), reverts the KYC fields backfilled onto the
     * primary, clears the absorbed alternate_mobile, and moves every
     * recorded row back to the duplicate. Only ever touches what this
     * specific merge changed — later, unrelated edits to the primary are
     * left alone.
     */
    public function undo(CustomerMerge $customerMerge): Customer
    {
        if ($customerMerge->isReversed()) {
            throw new RuntimeException('This merge has already been undone.');
        }

        return DB::transaction(function () use ($customerMerge) {
            $primary = Customer::query()->whereKey($customerMerge->primary_customer_id)->lockForUpdate()->firstOrFail();
            $duplicate = Customer::withTrashed()->whereKey($customerMerge->duplicate_customer_id)->lockForUpdate()->firstOrFail();

            $duplicate->restore();

            if ($customerMerge->alternate_mobile_set && $primary->alternate_mobile === $customerMerge->duplicate_mobile) {
                $primary->alternate_mobile = null;
                $primary->save();
            }

            if ($customerMerge->duplicate_kyc_id) {
                $kyc = CustomerKyc::withTrashed()->find($customerMerge->duplicate_kyc_id);

                if ($kyc) {
                    if ($customerMerge->kyc_reassigned) {
                        // Was reassigned wholesale to the primary — detach it back.
                        $kyc->customer_id = $duplicate->id;
                        $kyc->save();
                    } else {
                        // Was soft-deleted after backfilling blanks on the primary's KYC.
                        $kyc->restore();

                        $revertFields = $customerMerge->kyc_backfilled_fields ?? [];
                        if ($revertFields && $primary->kyc) {
                            $primary->kyc->update(array_map(fn () => null, $revertFields));
                        }
                    }
                }
            }

            foreach ($customerMerge->moved_records ?? [] as $record) {
                DB::table($record['table'])->where('id', $record['id'])->update(['customer_id' => $duplicate->id]);
            }

            $customerMerge->update([
                'reversed_at' => now(),
                'reversed_by_user_id' => Auth::id(),
            ]);

            ActivityLog::create([
                'user_id' => Auth::id() ?? 1,
                'module' => 'Customers',
                'sub_module' => 'Merge',
                'action' => 'Update',
                'description' => "Undid merge #{$customerMerge->id}: restored customer #{$duplicate->id} ({$duplicate->name}) out of #{$primary->id} ({$primary->name}).",
                'metadata' => [
                    'customer_merge_id' => $customerMerge->id,
                    'primary_customer_id' => $primary->id,
                    'duplicate_customer_id' => $duplicate->id,
                ],
            ]);

            return $primary->fresh(['kyc', 'user', 'memberships']);
        });
    }

    /**
     * Absorb the duplicate's mobile into the primary's alternate_mobile slot.
     * Rejects if that slot is already taken by a different number — only one
     * alternate mobile is supported per customer. Returns whether it was set.
     */
    private function absorbMobile(Customer $primary, Customer $duplicate): bool
    {
        if (empty($duplicate->mobile) || $duplicate->mobile === $primary->mobile) {
            return false;
        }

        if (! empty($primary->alternate_mobile) && $primary->alternate_mobile !== $duplicate->mobile) {
            throw new RuntimeException(
                "Customer #{$primary->id} already has an alternate mobile ({$primary->alternate_mobile}). ".
                'Resolve manually before merging another number in.'
            );
        }

        $primary->alternate_mobile = $duplicate->mobile;
        $primary->save();

        return true;
    }

    /**
     * Backfill any blank field on the primary's KYC record from the
     * duplicate's, then soft-delete the duplicate's KYC row rather than
     * reassigning it — a customer has at most one KYC record in this app.
     * Returns everything undo() needs to reverse this step.
     *
     * @return array{reassigned: bool, backfilled_fields: array<string,mixed>, duplicate_kyc_id: int|null}
     */
    private function mergeKyc(Customer $primary, Customer $duplicate): array
    {
        $duplicateKyc = $duplicate->kyc;

        if (! $duplicateKyc) {
            return ['reassigned' => false, 'backfilled_fields' => [], 'duplicate_kyc_id' => null];
        }

        $primaryKyc = $primary->kyc;

        if (! $primaryKyc) {
            // Primary never had KYC data — just reassign the duplicate's row.
            $duplicateKyc->customer_id = $primary->id;
            $duplicateKyc->save();

            return ['reassigned' => true, 'backfilled_fields' => [], 'duplicate_kyc_id' => $duplicateKyc->id];
        }

        $updates = [];
        foreach ($duplicateKyc->getFillable() as $field) {
            if ($field === 'customer_id') {
                continue;
            }

            if (blank($primaryKyc->{$field}) && ! blank($duplicateKyc->{$field})) {
                $updates[$field] = $duplicateKyc->{$field};
            }
        }

        if ($updates) {
            $primaryKyc->update($updates);
        }

        $duplicateKyc->delete();

        return ['reassigned' => false, 'backfilled_fields' => $updates, 'duplicate_kyc_id' => $duplicateKyc->id];
    }
}
