<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $normalizedRoleNames = collect($user->roles?->pluck('name') ?? [])
            ->filter()
            ->map(fn ($role) => strtolower(str_replace(['_', ' '], '-', (string) $role)))
            ->values();

        $isSuperAdmin = $user->hasRole('super-admin')
            || $normalizedRoleNames->contains('super-admin')
            || $normalizedRoleNames->contains('superadmin');

        if ($isSuperAdmin) {
            return $next($request);
        }

        if ($roles !== [] && ! $user->hasAnyRole($roles)) {
            return response()->json([
                'message' => 'You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
