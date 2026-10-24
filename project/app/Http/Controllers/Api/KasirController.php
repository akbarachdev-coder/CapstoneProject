<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Kasir\StoreKasirRequest;
use App\Http\Requests\Kasir\UpdateKasirRequest;
use App\Http\Resources\KasirResource;
use App\Models\Kasir;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KasirController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $kasir = Kasir::query()
            ->with('user')
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where('nama_kasir', 'like', '%'.$search.'%');
            })
            ->orderBy('nama_kasir')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return KasirResource::collection($kasir);
    }

    public function store(StoreKasirRequest $request): JsonResponse
    {
        $data = $request->validated();

        $kasir = DB::transaction(function () use ($data) {
            $kasir = Kasir::create([
                'nama_kasir' => $data['nama_kasir'],
            ]);

            $user = new User([
                'name' => $data['nama_kasir'],
                'email' => strtolower($data['email']),
                'password' => $data['password'],
                'is_active' => $data['is_active'] ?? true,
                'id_kasir' => $kasir->id_kasir,
            ]);
            $user->role = User::ROLE_KASIR;
            $user->save();

            return $kasir;
        });

        $kasir->load('user');

        AuditLogger::log('kasir.created', 'kasir', $kasir->id_kasir, [
            'user_id' => $kasir->user?->id,
        ]);

        return (new KasirResource($kasir))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Kasir $kasir): KasirResource
    {
        $kasir->load('user')->loadCount('transaksi');

        return new KasirResource($kasir);
    }

    public function update(UpdateKasirRequest $request, Kasir $kasir): KasirResource
    {
        $data = $request->validated();
        $user = $kasir->user;

        if (! $user && (array_key_exists('email', $data)
            || array_key_exists('password', $data)
            || array_key_exists('is_active', $data))) {
            throw ValidationException::withMessages([
                'email' => ['Kasir ini belum memiliki akun. Isi email dan kata sandi untuk membuat akun.'],
            ]);
        }

        DB::transaction(function () use ($kasir, $user, $data) {
            if (array_key_exists('nama_kasir', $data)) {
                $kasir->nama_kasir = $data['nama_kasir'];
                $kasir->save();
            }

            if (! $user) {
                return;
            }

            if (array_key_exists('nama_kasir', $data)) {
                $user->name = $data['nama_kasir'];
            }

            if (array_key_exists('email', $data)) {
                $user->email = strtolower($data['email']);
            }

            if (! empty($data['password'])) {
                $user->password = $data['password'];
                $user->tokens()->delete();
            }

            if (array_key_exists('is_active', $data)) {
                $user->is_active = (bool) $data['is_active'];

                if (! $user->is_active) {
                    $user->tokens()->delete();
                }
            }

            $user->save();
        });

        $kasir->load('user');

        AuditLogger::log('kasir.updated', 'kasir', $kasir->id_kasir, [
            'user_id' => $kasir->user?->id,
            'is_active' => $kasir->user?->is_active,
        ]);

        return new KasirResource($kasir);
    }

    public function destroy(Kasir $kasir): JsonResponse
    {
        if ($kasir->transaksi()->exists()) {
            return response()->json([
                'message' => 'Kasir tidak dapat dihapus karena masih memiliki transaksi.',
            ], 409);
        }

        DB::transaction(function () use ($kasir) {
            $kasir->user?->tokens()->delete();
            $kasir->user?->delete();
            $kasir->delete();
        });

        AuditLogger::log('kasir.deleted', 'kasir', $kasir->id_kasir);

        return response()->json([
            'message' => 'Kasir berhasil dihapus.',
        ]);
    }
}
