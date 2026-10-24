<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    private const MAX_PAYLOAD_BYTES = 1_048_576;

    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) str()->uuid();
        $request->attributes->set('request_id', $requestId);

        if ($request->isMethodSafe() === false && (int) $request->server('CONTENT_LENGTH') > self::MAX_PAYLOAD_BYTES) {
            return response()->json([
                'message' => 'Ukuran permintaan melebihi batas 1 MB.',
            ], Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }

        $response = $next($request);

        $response->headers->set('X-Request-ID', $requestId);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-site');
        $response->headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
