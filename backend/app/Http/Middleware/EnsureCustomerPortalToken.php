<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerPortalToken
{
    /**
     * Sanctum abilities can't distinguish staff from customer tokens here — staff
     * tokens are issued via createToken('api-token') with no ability list, which
     * defaults to ['*'] and would satisfy any ability check trivially. The token
     * *name* is the only thing that reliably differs between the two login flows.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if (! $token instanceof PersonalAccessToken || $token->name !== 'customer-portal') {
            abort(403, 'This endpoint is only accessible via the customer portal.');
        }

        return $next($request);
    }
}
