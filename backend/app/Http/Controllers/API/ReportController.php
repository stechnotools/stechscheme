<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reportService)
    {
    }

    public function dashboard(): JsonResponse
    {
        return response()->json([
            'data' => $this->reportService->dashboard(),
        ]);
    }

    public function dailyCollection(Request $request): JsonResponse
    {
        return response()->json(
            $this->reportService->dailyCollection($request)
        );
    }

    public function customerLedger(Request $request): JsonResponse
    {
        return response()->json(
            $this->reportService->customerLedger($request)
        );
    }

    public function customerStatement(Request $request): JsonResponse
    {
        return response()->json(
            $this->reportService->customerStatement($request)
        );
    }

    public function dailyCollectionCsv(Request $request)
    {
        return $this->reportService->dailyCollectionCsv($request);
    }

    public function dailyCollectionPdf(Request $request)
    {
        $pdf = $this->reportService->dailyCollectionPdf($request);

        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        return $pdf->download("daily-collection-{$dateFrom}-to-{$dateTo}.pdf");
    }

    public function pendingInstallments(Request $request): JsonResponse
    {
        return response()->json(
            $this->reportService->pendingInstallments($request)
        );
    }

    public function overdueInstallments(Request $request): JsonResponse
    {
        return response()->json(
            $this->reportService->overdueInstallments($request)
        );
    }
}
