<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushBroadcastController extends Controller
{
    public function __construct(private readonly PushNotificationService $pushNotificationService)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'body' => ['required', 'string', 'max:500'],
            'url' => ['nullable', 'string', 'max:255'],
        ]);

        $userIds = PushSubscription::query()->distinct()->pluck('user_id');

        foreach (User::whereIn('id', $userIds)->get() as $user) {
            $this->pushNotificationService->sendToUser($user, $validated['title'], $validated['body'], $validated['url'] ?? null);
        }

        return response()->json([
            'message' => "Broadcast queued for {$userIds->count()} subscribed device(s).",
        ]);
    }
}
