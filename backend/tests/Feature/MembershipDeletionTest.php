<?php

namespace Tests\Feature;

use App\Models\CommissionType;
use App\Models\Customer;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Payment;
use App\Models\PendingPayment;
use App\Models\SalesmanCommission;
use App\Models\Scheme;
use App\Models\User;
use App\Services\MembershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MembershipDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_membership_delete_cleans_up_dependent_rows_before_removing_membership(): void
    {
        $membership = $this->makeMembershipWithHistory();

        app(MembershipService::class)->delete($membership);

        $this->assertDatabaseMissing('memberships', ['id' => $membership->id]);
        $this->assertDatabaseMissing('installments', ['membership_id' => $membership->id]);
        $this->assertDatabaseMissing('payments', ['membership_id' => $membership->id]);
        $this->assertDatabaseMissing('pending_payments', ['membership_id' => $membership->id]);
        $this->assertDatabaseMissing('salesman_commissions', ['membership_id' => $membership->id]);
    }

    private function makeMembershipWithHistory(): Membership
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Delete Test Customer',
            'mobile' => '9000000100',
            'email' => 'delete.test@example.com',
            'status' => 'active',
        ]);

        $scheme = Scheme::query()->create([
            'name' => 'Delete Test Scheme',
            'code' => 'DTS',
            'installment_value' => 1000,
            'total_installments' => 3,
            'scheme_type' => 'gold',
            'grace_days' => 0,
            'allow_overdue' => true,
        ]);

        $membership = Membership::query()->create([
            'customer_id' => $customer->id,
            'user_id' => $user->id,
            'scheme_id' => $scheme->id,
            'membership_no' => 'MEM-DELETE-001',
            'start_date' => '2026-07-01',
            'maturity_date' => '2026-09-01',
            'total_paid' => 0,
            'status' => 'active',
        ]);

        $firstInstallment = Installment::query()->create([
            'membership_id' => $membership->id,
            'installment_no' => 1,
            'due_date' => '2026-07-01',
            'amount' => 1000,
            'paid' => false,
            'penalty' => 0,
            'paid_amount' => 0,
            'balance_amount' => 1000,
            'status' => 'PENDING',
        ]);

        Installment::query()->create([
            'membership_id' => $membership->id,
            'installment_no' => 2,
            'due_date' => '2026-08-01',
            'amount' => 1000,
            'paid' => false,
            'penalty' => 0,
            'paid_amount' => 0,
            'balance_amount' => 1000,
            'status' => 'PENDING',
        ]);

        Payment::query()->create([
            'membership_id' => $membership->id,
            'installment_id' => $firstInstallment->id,
            'amount' => 500,
            'gateway' => 'cash',
            'transaction_id' => 'TXN-DELETE-001',
            'payment_date' => '2026-07-02',
            'status' => 'success',
        ]);

        PendingPayment::query()->create([
            'membership_id' => $membership->id,
            'customer_id' => $customer->id,
            'installment_ids' => [$firstInstallment->id],
            'amount' => 500,
            'merchant_order_id' => 'ORDER-DELETE-001',
            'phonepe_order_id' => 'PH-DELETE-001',
            'status' => 'initiated',
        ]);

        $commissionType = CommissionType::query()->create([
            'code' => 'ENROLL',
            'name' => 'Enrollment Commission',
            'status' => 'active',
        ]);

        SalesmanCommission::query()->create([
            'salesman_id' => $user->id,
            'customer_id' => $customer->id,
            'scheme_id' => $scheme->id,
            'membership_id' => $membership->id,
            'commission_type_id' => $commissionType->id,
            'event_type' => 'enrollment',
            'source_type' => 'membership',
            'source_id' => $membership->id,
            'rule_source' => 'global',
            'rule_id' => null,
            'calculation_type' => 'flat',
            'base_amount' => 1000,
            'commission_amount' => 100,
            'status' => 'pending',
            'commission_date' => '2026-07-02',
            'paid_at' => null,
        ]);

        return $membership->fresh(['installments', 'payments']);
    }
}
