<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Reservasi\StoreReservasiRequest;
use App\Http\Requests\Reservasi\UpdateReservasiRequest;
use App\Http\Resources\ReservasiResource;
use App\Models\Reservasi;
use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ReservasiController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status_reservasi' => ['nullable', 'string', Rule::in(Reservasi::STATUS)],
            'id_pelanggan' => ['nullable', 'integer', 'exists:pelanggan,id_pelanggan'],
            'tanggal' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $reservasi = Reservasi::query()
            ->with('pelanggan')
            ->when($validated['status_reservasi'] ?? null, fn ($query, $status) => $query->where('status_reservasi', $status))
            ->when($validated['id_pelanggan'] ?? null, fn ($query, $id) => $query->where('id_pelanggan', $id))
            ->when($validated['tanggal'] ?? null, fn ($query, $date) => $query->whereDate('tgl_reservasi', Carbon::parse($date)->toDateString()))
            ->orderByDesc('tgl_reservasi')
            ->orderByDesc('waktu_reservasi')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return ReservasiResource::collection($reservasi);
    }

    public function store(StoreReservasiRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['status_reservasi'] = Reservasi::STATUS_PENDING;

        $reservasi = Reservasi::create($data);

        AuditLogger::log('reservasi.created', 'reservasi', $reservasi->id_reservasi);

        return (new ReservasiResource($reservasi->load('pelanggan')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Reservasi $reservasi): ReservasiResource
    {
        $reservasi->load('pelanggan');

        return new ReservasiResource($reservasi);
    }

    public function update(UpdateReservasiRequest $request, Reservasi $reservasi): ReservasiResource
    {
        if (in_array($reservasi->status_reservasi, [Reservasi::STATUS_SELESAI, Reservasi::STATUS_DIBATALKAN], true)) {
            abort(409, 'Reservasi yang sudah selesai atau dibatalkan tidak dapat diubah.');
        }

        $reservasi->update($request->validated());
        $reservasi->load('pelanggan');

        AuditLogger::log('reservasi.updated', 'reservasi', $reservasi->id_reservasi, [
            'status' => $reservasi->status_reservasi,
        ]);

        return new ReservasiResource($reservasi);
    }

    public function destroy(Reservasi $reservasi): JsonResponse
    {
        if (! in_array($reservasi->status_reservasi, [Reservasi::STATUS_PENDING, Reservasi::STATUS_DIBATALKAN], true)) {
            return response()->json([
                'message' => 'Reservasi yang sudah dikonfirmasi atau selesai tidak dapat dihapus.',
            ], 409);
        }

        $id = $reservasi->id_reservasi;
        $reservasi->delete();

        AuditLogger::log('reservasi.deleted', 'reservasi', $id);

        return response()->json([
            'message' => 'Reservasi berhasil dihapus.',
        ]);
    }
}
