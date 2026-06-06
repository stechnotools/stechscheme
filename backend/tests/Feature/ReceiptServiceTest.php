<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Scheme;
use App\Models\User;
use App\Services\ReceiptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceiptServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_receipt_can_pay_multiple_installments(): void
    {
        $membership = $this->makeMembership();
        $installments = $membership->installments()->orderBy('installment_no')->take(3)->get();

        $receipt = app(ReceiptService::class)->createReceipt(
            $membership,
            $installments->map(fn (Installment $installment) => ['id' => $installment->id])->all(),
            [['gateway' => 'cash', 'amount' => 3000]],
            '2026-05-26'
        );

        $this->assertSame('3000.00', $receipt->details()->sum('amount'));
        $this->assertCount(3, $receipt->details);
        $this->assertSame(3, $membership->installments()->where('status', 'PAID')->count());
        $this->assertVoucherBalances($receipt->id, 3000, 3000);
    }

    public function test_one_installment_can_receive_multiple_receipts(): void
    {
        $membership = $this->makeMembership();
        $installment = $membership->installments()->orderBy('installment_no')->firstOrFail();

        app(ReceiptService::class)->createReceipt(
            $membership,
            [['id' => $installment->id]],
            [['gateway' => 'cash', 'amount' => 400]],
            '2026-05-26'
        );

        $installment->refresh();
        $this->assertSame('PARTIAL', $installment->status);
        $this->assertSame('600.00', $installment->balance_amount);

        app(ReceiptService::class)->createReceipt(
            $membership,
            [['id' => $installment->id]],
            [['gateway' => 'cash', 'amount' => 600]],
            '2026-05-27'
        );

        $installment->refresh();
        $this->assertSame('PAID', $installment->status);
        $this->assertSame('0.00', $installment->balance_amount);
        $this->assertSame(2, $installment->receiptDetails()->count());
    }

    public function test_mixed_payment_methods_create_split_debits(): void
    {
        $membership = $this->makeMembership();
        $installments = $membership->installments()->orderBy('installment_no')->take(3)->get();

        $receipt = app(ReceiptService::class)->createReceipt(
            $membership,
            $installments->map(fn (Installment $installment) => ['id' => $installment->id])->all(),
            [
                ['gateway' => 'cash', 'amount' => 2000],
                ['gateway' => 'upi', 'amount' => 1000],
            ],
            '2026-05-26'
        );

        $this->assertSame(2, $receipt->payments()->count());
        $this->assertDatabaseHas('voucher_transactions', ['ledger' => 'Cash A/C', 'DR' => 2000, 'CR' => 0]);
        $this->assertDatabaseHas('voucher_transactions', ['ledger' => 'UPI A/C', 'DR' => 1000, 'CR' => 0]);
        $this->assertVoucherBalances($receipt->id, 3000, 3000);
    }

    public function test_advance_installments_are_allowed(): void
    {
        $membership = $this->makeMembership();
        $installments = $membership->installments()->orderBy('installment_no')->take(5)->get();

        app(ReceiptService::class)->createReceipt(
            $membership,
            $installments->map(fn (Installment $installment) => ['id' => $installment->id])->all(),
            [['gateway' => 'cash', 'amount' => 5000]],
            '2026-05-26'
        );

        $this->assertSame(5, $membership->installments()->where('status', 'PAID')->count());
    }

    public function test_late_fee_is_posted_to_income_ledger(): void
    {
        $membership = $this->makeMembership();
        $installment = $membership->installments()->orderBy('installment_no')->firstOrFail();
        $installment->update([
            'penalty' => 50,
            'balance_amount' => 1050,
        ]);

        $receipt = app(ReceiptService::class)->createReceipt(
            $membership,
            [['id' => $installment->id]],
            [['gateway' => 'cash', 'amount' => 1050]],
            '2026-05-26'
        );

        $detail = $receipt->details()->firstOrFail();
        $this->assertSame('1000.00', $detail->amount);
        $this->assertSame('50.00', $detail->late_fee);
        $this->assertDatabaseHas('voucher_transactions', ['ledger' => 'Late Fee Income A/C', 'DR' => 0, 'CR' => 50]);
        $this->assertVoucherBalances($receipt->id, 1050, 1050);
    }

    private function makeMembership(): Membership
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Scheme Customer',
            'mobile' => '9000000000',
            'email' => 'scheme.customer@example.com',
            'status' => 'active',
        ]);
        $scheme = Scheme::query()->create([
            'name' => 'Swarna Laxmi Yojana',
            'code' => 'SLY',
            'installment_value' => 1000,
            'total_installments' => 12,
            'scheme_type' => 'gold',
            'grace_days' => 0,
            'allow_overdue' => true,
        ]);

        ChartOfAccount::query()->create([
            'name' => 'Gold Scheme Collection A/C',
            'account_type' => 'Liability',
            'is_active' => true,
            'source_type' => 'scheme',
            'source_id' => $scheme->id,
        ]);

        $membership = Membership::query()->create([
            'customer_id' => $customer->id,
            'user_id' => $user->id,
            'scheme_id' => $scheme->id,
            'membership_no' => 'MEM-260522-0022',
            'start_date' => '2026-05-26',
            'maturity_date' => '2027-04-26',
            'total_paid' => 0,
            'status' => 'active',
        ]);

        for ($index = 1; $index <= 12; $index++) {
            Installment::query()->create([
                'membership_id' => $membership->id,
                'installment_no' => $index,
                'due_date' => now()->addMonths($index - 1)->toDateString(),
                'amount' => 1000,
                'paid' => false,
                'penalty' => 0,
                'paid_amount' => 0,
                'balance_amount' => 1000,
                'status' => 'PENDING',
            ]);
        }

        return $membership->fresh(['installments']);
    }

    private function assertVoucherBalances(int $receiptId, float $expectedDebit, float $expectedCredit): void
    {
        $voucher = \App\Models\Voucher::query()->where('receipt_id', $receiptId)->firstOrFail();

        $this->assertSame(number_format($expectedDebit, 2, '.', ''), number_format((float) $voucher->transactions()->sum('DR'), 2, '.', ''));
        $this->assertSame(number_format($expectedCredit, 2, '.', ''), number_format((float) $voucher->transactions()->sum('CR'), 2, '.', ''));
    }
}
