<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMobileVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->mobile_verified) {
            return response()->json([
                'message' => 'Mobile number is not verified.',
            ], 403);
        }

        return $next($request);
    }
}
