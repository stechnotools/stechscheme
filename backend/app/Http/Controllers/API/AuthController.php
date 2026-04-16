<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $auth = $this->authService->register($payload);

        return response()->json([
            'message' => 'Registered successfully.',
            'token' => $auth['token'],
            'data' => $auth['user'],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $auth = $this->authService->login($request->validated());

        if (! $auth) {
            return response()->json([
                'message' => 'Email/mobile or password is invalid',
            ], 401);
        }

        return response()->json([
            'message' => 'Login successful.',
            'token' => $auth['token'],
            'data' => $auth['user'],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()?->load(['roles.permissions', 'permissions']);

        return response()->json([
            'data' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
