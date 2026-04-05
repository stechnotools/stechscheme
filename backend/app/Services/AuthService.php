<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function register(array $validated): array
    {
        $user = User::create($validated);
        $token = $user->createToken('api-token')->plainTextToken;

        return [
            'user' => $user->load(['company', 'roles.permissions', 'permissions']),
            'token' => $token,
        ];
    }

    public function login(array $validated): ?array
    {
        $user = User::query()
            ->where('email', $validated['login'])
            ->orWhere('mobile', $validated['login'])
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return null;
        }

        return [
            'user' => $user->load(['company', 'roles.permissions', 'permissions']),
            'token' => $user->createToken('api-token')->plainTextToken,
        ];
    }

    public function logout($user): void
    {
        $user?->currentAccessToken()?->delete();
    }
}
