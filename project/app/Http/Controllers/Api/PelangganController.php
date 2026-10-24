<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Pelanggan\StorePelangganRequest;
use App\Http\Requests\Pelanggan\UpdatePelangganRequest;
use App\Http\Resources\PelangganResource;
use App\Models\Pelanggan;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PelangganController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pelanggan = Pelanggan::query()
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama_pelanggan', 'like', '%'.$search.'%')
                        ->orWhere('no_hp', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('nama_pelanggan')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return PelangganResource::collection($pelanggan);
    }

    public function store(StorePelangganRequest $request): JsonResponse
    {
        $pelanggan = Pelanggan::create($request->validated());

        AuditLogger::log('pelanggan.created', 'pelanggan', $pelanggan->id_pelanggan);

        return (new PelangganResource($pelanggan))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Pelanggan $pelanggan): PelangganResource
    {
        return new PelangganResource($pelanggan);
    }

    public function update(UpdatePelangganRequest $request, Pelanggan $pelanggan): PelangganResource
    {
        $pelanggan->update($request->validated());

        AuditLogger::log('pelanggan.updated', 'pelanggan', $pelanggan->id_pelanggan);

        return new PelangganResource($pelanggan);
    }

    public function destroy(Pelanggan $pelanggan): JsonResponse
    {
        if ($pelanggan->transaksi()->exists() || $pelanggan->reservasi()->exists()) {
            return response()->json([
                'message' => 'Pelanggan tidak dapat dihapus karena masih memiliki transaksi atau reservasi.',
            ], 409);
        }

        $id = $pelanggan->id_pelanggan;
        $pelanggan->delete();

        AuditLogger::log('pelanggan.deleted', 'pelanggan', $id);

        return response()->json([
            'message' => 'Pelanggan berhasil dihapus.',
        ]);
    }
}
