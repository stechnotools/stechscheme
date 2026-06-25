<?php

namespace App\Jobs;

use App\Models\Customer;
use App\Services\PushNotificationService;
use App\Services\SmsService;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendInstallmentReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param array<int, array{installment_no: int, due_date: string, amount: string, overdue: bool}> $installments
     */
    public function __construct(
        public Customer $customer,
        public array $installments,
    ) {
    }

    public function handle(WhatsAppService $whatsAppService, SmsService $smsService, PushNotificationService $pushNotificationService): void
    {
        if (empty($this->installments) || empty($this->customer->mobile)) {
            return;
        }

        $message = $this->composeMessage();

        $whatsAppService->sendMessage($this->customer->mobile, $message);
        $smsService->sendMessage($this->customer->mobile, $message);

        if ($this->customer->user) {
            $pushNotificationService->sendToUser($this->customer->user, 'Installment Reminder', $message, '/customer/panel');
        }
    }

    private function composeMessage(): string
    {
        $overdueCount = count(array_filter($this->installments, fn (array $installment) => $installment['overdue']));
        $upcoming = array_values(array_filter($this->installments, fn (array $installment) => ! $installment['overdue']));

        $parts = [];

        if ($overdueCount > 0) {
            $parts[] = "{$overdueCount} installment(s) overdue";
        }

        if (! empty($upcoming)) {
            $next = $upcoming[0];
            $parts[] = "next installment of {$next['amount']} due on {$next['due_date']}";
        }

        $name = $this->customer->name ?: 'Customer';

        return "Dear {$name}, " . implode(' and ', $parts) . ' for your jewellery scheme. Please pay at your earliest convenience.';
    }
}
