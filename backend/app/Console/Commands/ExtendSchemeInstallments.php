<?php

namespace App\Console\Commands;

use App\Models\Scheme;
use App\Services\MembershipService;
use Illuminate\Console\Command;

/**
 * One-time backfill for schemes whose total_installments was raised before
 * SchemeService::update() started auto-extending subscriber schedules (or
 * whose total_installments was changed directly in the database, bypassing
 * that hook). Safe to re-run: extendInstallmentSchedulesForScheme() only
 * ever appends installments up to the target count and is a no-op for any
 * membership already at or beyond it.
 */
class ExtendSchemeInstallments extends Command
{
    protected $signature = 'schemes:extend-installments
        {scheme : Scheme ID or code}
        {--to= : Target total installments (defaults to the scheme\'s current total_installments)}';

    protected $description = 'Extend active/paused subscribers\' installment schedules on a scheme up to a target installment count';

    public function handle(MembershipService $membershipService): int
    {
        $identifier = $this->argument('scheme');

        $scheme = ctype_digit((string) $identifier)
            ? Scheme::query()->find((int) $identifier)
            : Scheme::query()->where('code', $identifier)->first();

        if (! $scheme) {
            $this->error("Scheme \"{$identifier}\" not found.");

            return self::FAILURE;
        }

        $target = $this->option('to') !== null
            ? (int) $this->option('to')
            : (int) $scheme->total_installments;

        if ($target < 1) {
            $this->error('Target installment count must be at least 1.');

            return self::FAILURE;
        }

        $this->info("Extending memberships on \"{$scheme->name}\" (#{$scheme->id}) to {$target} installments...");

        $updated = $membershipService->extendInstallmentSchedulesForScheme($scheme, $target);

        $this->info("Done. {$updated} membership(s) had installments appended.");

        return self::SUCCESS;
    }
}
