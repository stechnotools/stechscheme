<?php

namespace App\Jobs;

use App\Models\SchemeOpening;
use App\Services\SchemeOpeningProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Background-queued counterpart to SchemeOpeningController::process() for a
 * single staged row. One job per row (not one job per batch) so a worker
 * restart or a single row's failure never affects the others — each row's
 * status commits to the DB independently, same as the synchronous endpoint.
 */
class ProcessSchemeOpeningRowJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        private readonly int $schemeOpeningId
    ) {
    }

    public function handle(SchemeOpeningProcessingService $processingService): void
    {
        // Re-check status here too: if this row was already processed via the
        // synchronous endpoint (or another worker) before this job ran, skip
        // it — but a Failed row is a valid retry target, same as the
        // synchronous endpoint (see SchemeOpeningController::process()).
        $data = SchemeOpening::where('id', $this->schemeOpeningId)
            ->whereIn('status', ['Pending', 'Failed'])
            ->first();

        if (! $data) {
            return;
        }

        $schemeMap = $processingService->buildSchemeMap();
        $resolvedSalesmen = [];

        $processingService->processOne($data, $schemeMap, $resolvedSalesmen);
    }
}
