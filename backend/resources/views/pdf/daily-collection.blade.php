<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; font-size: 11px; color: #1f2937; margin: 20px; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        .muted { color: #6b7280; font-size: 10px; }
        .filter-info { margin: 8px 0 16px 0; font-size: 10px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 5px 6px; text-align: left; }
        th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
        .right { text-align: right; }
        .section-title { margin-top: 20px; font-size: 13px; font-weight: bold; }
        .total-row td { font-weight: bold; background: #f9fafb; }
        .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
        .summary-box { border: 1px solid #e5e7eb; padding: 8px 14px; flex: 1; min-width: 100px; }
        .summary-box .label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        .summary-box .value { font-size: 14px; font-weight: bold; margin-top: 4px; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; background: #f3f4f6; }
        .badge-cash { background: #e0f2fe; color: #0369a1; }
        .badge-upi { background: #dcfce7; color: #15803d; }
        .badge-card { background: #fef3c7; color: #b45309; }
        .badge-cheque { background: #ede9fe; color: #6d28d9; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <h1>Daily Collection Report</h1>
    <p class="muted">
        Generated on {{ $generatedAt }}
        @if ($dateFrom === $dateTo)
            &middot; Date: {{ $dateFrom }}
        @else
            &middot; Period: {{ $dateFrom }} to {{ $dateTo }}
        @endif
    </p>

    <div class="summary-grid">
        @foreach (['cash' => 'Cash', 'upi' => 'UPI', 'card' => 'Card', 'cheque' => 'Cheque'] as $key => $label)
            @if (($modeTotals[$key] ?? 0) > 0)
                <div class="summary-box">
                    <div class="label">{{ $label }}</div>
                    <div class="value" style="color: {{ $key === 'cash' ? '#0369a1' : ($key === 'upi' ? '#15803d' : ($key === 'card' ? '#b45309' : '#6d28d9')) }}">
                        &#8377;{{ number_format((float) ($modeTotals[$key] ?? 0), 2) }}
                    </div>
                </div>
            @endif
        @endforeach
        @if (($modeTotals['other'] ?? 0) > 0)
            <div class="summary-box">
                <div class="label">Other</div>
                <div class="value">&#8377;{{ number_format((float) $modeTotals['other'], 2) }}</div>
            </div>
        @endif
        <div class="summary-box" style="background: #0f172a; color: white; border-color: #1e293b;">
            <div class="label" style="color: rgba(255,255,255,0.7);">Grand Total</div>
            <div class="value">&#8377;{{ number_format((float) $modeTotals['grand_total'], 2) }}</div>
            <div style="font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 2px;">
                {{ $modeTotals['transaction_count'] }} transaction{{ $modeTotals['transaction_count'] !== 1 ? 's' : '' }}
            </div>
        </div>
    </div>

    <div class="section-title">Transaction Details</div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Scheme</th>
                <th>Membership</th>
                <th>Mode</th>
                <th>Transaction ID</th>
                <th>Branch</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($payments as $idx => $payment)
                @php
                    $membership = $payment->membership;
                    $gw = $payment->gateway ?: 'cash';
                @endphp
                <tr>
                    <td>{{ $idx + 1 }}</td>
                    <td>{{ $payment->receipt?->receipt_no ?? 'N/A' }}</td>
                    <td>{{ optional($payment->payment_date)->format('d-m-Y') }}</td>
                    <td>
                        {{ $membership?->customer?->name ?? 'Unknown' }}
                        @if ($membership?->customer?->mobile)
                            <br><span style="font-size: 9px; color: #6b7280;">{{ $membership->customer->mobile }}</span>
                        @endif
                    </td>
                    <td>{{ $membership?->scheme?->name ?? 'N/A' }}</td>
                    <td>{{ $membership?->membership_no ?? 'N/A' }}</td>
                    <td>
                        <span class="badge badge-{{ $gw }}">{{ $gw }}</span>
                    </td>
                    <td style="font-size: 9px;">{{ $payment->transaction_id ?? '-' }}</td>
                    <td>{{ $payment->receipt?->branch?->name ?? '-' }}</td>
                    <td class="right">&#8377;{{ number_format((float) $payment->amount, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="10" style="text-align: center; padding: 20px; color: #6b7280;">No collections found for the selected filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Daily Collection Report &middot; {{ $generatedAt }} &middot; Generated by JewelleryScheme System
    </div>
</body>
</html>
