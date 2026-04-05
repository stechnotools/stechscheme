<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

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
}
