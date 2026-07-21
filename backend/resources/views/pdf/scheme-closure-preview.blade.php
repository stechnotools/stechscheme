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
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
        .badge-close { background: #dcfce7; color: #15803d; }
        .badge-force { background: #fee2e2; color: #b91c1c; }
        .total-row td { font-weight: bold; background: #f9fafb; }
    </style>
</head>
<body>
    <h1>Gold Scheme Closure Preview</h1>
    <p class="muted">
        Entry No: {{ $evaluation['entry_no'] }} &middot; Generated on {{ $generatedAt }} &middot;
        <span class="badge {{ $mode === 'force-close' ? 'badge-force' : 'badge-close' }}">
            {{ $mode === 'force-close' ? 'FORCE CLOSE (EARLY EXIT)' : 'MATURITY CLOSE' }}
        </span>
    </p>

    <table>
        <tr>
            <th>Customer</th>
            <td>{{ $membership->customer->name ?? $membership->customer->mobile ?? '-' }}</td>
            <th>Mobile</th>
            <td>{{ $membership->customer->mobile ?? '-' }}</td>
        </tr>
        <tr>
            <th>Scheme</th>
            <td>{{ $membership->scheme->name ?? '-' }} ({{ $membership->scheme->code ?? '-' }})</td>
            <th>Membership No</th>
            <td>{{ $membership->membership_no ?? '-' }}</td>
        </tr>
        <tr>
            <th>Start Date</th>
            <td>{{ optional($membership->start_date)->format('d-m-Y') ?? '-' }}</td>
            <th>Maturity Date</th>
            <td>{{ optional($membership->maturity_date)->format('d-m-Y') ?? '-' }}</td>
        </tr>
    </table>

    @if ($mode === 'close')
        <div class="section-title">Closure Summary</div>
        <table>
            <tr>
                <th>Total Paid</th>
                <td class="right">&#8377;{{ number_format((float) $membership->total_paid, 2) }}</td>
                <th>Remaining Payable</th>
                <td class="right">&#8377;{{ number_format((float) $evaluation['remaining_amount'], 2) }}</td>
            </tr>
            <tr>
                <th>Maturity Bonus</th>
                <td class="right">&#8377;{{ number_format((float) $evaluation['bonus']['amount'], 2) }}</td>
                <th>Bonus Detail</th>
                <td>{{ $evaluation['bonus']['detail'] }}</td>
            </tr>
        </table>
    @else
        <div class="section-title">Settlement Calculation</div>
        <table>
            <tr>
                <th>Total Paid</th>
                <td class="right">&#8377;{{ number_format((float) $evaluation['total_paid'], 2) }}</td>
                <th>Closing Penalty ({{ $evaluation['penalty_percent'] }}%)</th>
                <td class="right">- &#8377;{{ number_format((float) $evaluation['penalty_amount'], 2) }}</td>
            </tr>
            <tr>
                <th>Maturity Bonus {{ $evaluation['lock_in_passed'] ? '' : '(forfeited)' }}</th>
                <td class="right">&#8377;{{ number_format((float) $evaluation['bonus']['amount'], 2) }}</td>
                <th>Customer Receives</th>
                <td class="right">&#8377;{{ number_format((float) $evaluation['payout_amount'], 2) }}</td>
            </tr>
        </table>
    @endif

    <div class="section-title">Accounting Entry Preview</div>
    <table>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Ledger Name</th>
                <th>Ledger Code</th>
                <th class="right">Debit (&#8377;)</th>
                <th class="right">Credit (&#8377;)</th>
                <th>Remarks</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($evaluation['voucher_lines'] as $index => $line)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $line['ledger_name'] }}</td>
                    <td>{{ $line['ledger_code'] ?? '-' }}</td>
                    <td class="right">{{ $line['debit'] > 0 ? number_format($line['debit'], 2) : '-' }}</td>
                    <td class="right">{{ $line['credit'] > 0 ? number_format($line['credit'], 2) : '-' }}</td>
                    <td>{{ $line['remarks'] }}</td>
                </tr>
            @empty
                <tr><td colspan="6">No ledger entries to post.</td></tr>
            @endforelse
            @if (count($evaluation['voucher_lines']) > 0)
                <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td class="right">{{ number_format(array_sum(array_column($evaluation['voucher_lines'], 'debit')), 2) }}</td>
                    <td class="right">{{ number_format(array_sum(array_column($evaluation['voucher_lines'], 'credit')), 2) }}</td>
                    <td></td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="section-title">Narration</div>
    <p>{{ $evaluation['narration'] }}</p>
</body>
</html>
