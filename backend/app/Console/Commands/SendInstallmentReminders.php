<?php

namespace App\Console\Commands;

use App\Jobs\SendInstallmentReminderJob;
use App\Models\Installment;
use Illuminate\Console\Command;

class SendInstallmentReminders extends Command
{
    protected $signature = 'reminders:installments {--due-within=3 : Days ahead to include as an upcoming reminder}';

    protected $description = 'Queue WhatsApp/SMS reminders for customers with overdue or soon-due installments';

    public function handle(): int
    {
        $dueWithinDays = (int) $this->option('due-within');

        $installments = Installment::query()
            ->with('membership.customer')
            ->where(function ($query) use ($dueWithinDays) {
                $query->overdue()->orWhere(fn ($inner) => $inner->dueWithin($dueWithinDays));
            })
            ->get()
            ->filter(fn (Installment $installment) => $installment->membership?->customer !== null);

        $byCustomer = $installments->groupBy(fn (Installment $installment) => $installment->membership->customer->id);

        $queued = 0;

        foreach ($byCustomer as $customerInstallments) {
            $customer = $customerInstallments->first()->membership->customer;

            $payload = $customerInstallments
                ->map(fn (Installment $installment) => [
                    'installment_no' => $installment->installment_no,
                    'due_date' => $installment->due_date?->toDateString(),
                    'amount' => (string) $installment->amount,
                    'overdue' => $installment->isOverdueNow(),
                ])
                ->values()
                ->all();

            SendInstallmentReminderJob::dispatch($customer, $payload);
            $queued++;
        }

        $this->info("Queued reminders for {$queued} customer(s) covering {$installments->count()} installment(s).");

        return self::SUCCESS;
    }
}
