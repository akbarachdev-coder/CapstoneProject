<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends ApiController
{
    private const DUMMY_HASH = '$2y$12$FFiOvFabL7.c.aUp8dpal.S3Smct6ADDLLiFv642mpV8X.qBSLBga';

    public function login(LoginRequest $request): JsonResponse
    {
        $email = Str::lower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $user = User::where('email', $email)->first();

        $passwordValid = Hash::check($password, $user?->password ?? self::DUMMY_HASH);

        if (! $user || ! $passwordValid || ! $user->is_active) {
            AuditLogger::log('auth.login_failed', 'user', $user?->id, [
                'email_hash' => hash('sha256', $email),
            ]);

            return response()->json([
                'message' => 'Email atau kata sandi salah.',
            ], 401);
        }

        if (Hash::needsRehash($user->password)) {
            $user->password = $password;
            $user->save();
        }

        $user->tokens()->delete();

        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 480));
        $abilities = $user->isAdmin()
            ? ['*']
            : [
                'transaksi:read', 'transaksi:write',
                'pelanggan:read', 'pelanggan:write',
                'menu:read',
                'reservasi:read', 'reservasi:write',
                'pembayaran:write',
            ];

        $token = $user->createToken('api-token', $abilities, $expiresAt);

        AuditLogger::log('auth.login', 'user', $user->id, [
            'token_id' => $token->accessToken->id,
        ]);

        $user->loadMissing('kasir');

        return response()->json([
            'message' => 'Berhasil masuk.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
                'expires_at' => $expiresAt->toIso8601String(),
            ],
        ]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->loadMissing('kasir'));
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        AuditLogger::log('auth.logout', 'user', $user->id);

        return response()->json([
            'message' => 'Berhasil keluar.',
        ]);
    }
}
