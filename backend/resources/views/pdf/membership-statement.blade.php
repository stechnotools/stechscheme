<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #1f2937; }
        h1 { font-size: 18px; margin-bottom: 0; }
        .muted { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; }
        .section-title { margin-top: 24px; font-size: 14px; font-weight: bold; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <h1>Membership Statement</h1>
    <p class="muted">Generated on {{ $generatedAt }}</p>

    <table>
        <tr>
            <th>Customer</th>
            <td>{{ $customer->name ?? $customer->mobile }}</td>
            <th>Mobile</th>
            <td>{{ $customer->mobile }}</td>
        </tr>
        <tr>
            <th>Scheme</th>
            <td>{{ $scheme->name ?? '-' }}</td>
            <th>Membership No</th>
            <td>{{ $membership->membership_no ?? '-' }}</td>
        </tr>
        <tr>
            <th>Card No</th>
            <td>{{ $membership->card_no ?? '-' }}</td>
            <th>Maturity Date</th>
            <td>{{ optional($membership->maturity_date)->format('d-m-Y') ?? '-' }}</td>
        </tr>
        <tr>
            <th>Total Paid</th>
            <td colspan="3">&#8377;{{ number_format((float) $membership->total_paid, 2) }}</td>
        </tr>
    </table>

    <div class="section-title">Installments</div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Due Date</th>
                <th class="right">Amount</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($installments as $installment)
                <tr>
                    <td>{{ $installment->installment_no }}</td>
                    <td>{{ optional($installment->due_date)->format('d-m-Y') }}</td>
                    <td class="right">&#8377;{{ number_format((float) $installment->amount, 2) }}</td>
                    <td>{{ $installment->paid ? 'Paid' : 'Pending' }}</td>
                </tr>
            @empty
                <tr><td colspan="4">No installments recorded.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="section-title">Payments</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th class="right">Amount</th>
                <th>Gateway</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($payments as $payment)
                <tr>
                    <td>{{ optional($payment->payment_date)->format('d-m-Y') }}</td>
                    <td class="right">&#8377;{{ number_format((float) $payment->amount, 2) }}</td>
                    <td>{{ $payment->gateway ?? 'manual' }}</td>
                    <td>{{ $payment->status }}</td>
                </tr>
            @empty
                <tr><td colspan="4">No payments recorded.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
