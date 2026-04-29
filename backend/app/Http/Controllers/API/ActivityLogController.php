<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('user:id,name')->latest();

        if ($request->has('module')) {
            $query->where('module', $request->module);
        }

        if ($request->has('sub_module')) {
            $query->where('sub_module', $request->sub_module);
        }

        $logs = $query->limit(50)->get();

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}
