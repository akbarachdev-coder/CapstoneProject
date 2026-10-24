<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Pembayaran\StorePembayaranRequest;
use App\Http\Resources\PembayaranResource;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PembayaranController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'id_transaksi' => ['nullable', 'integer', 'exists:transaksi,id_transaksi'],
            'status_pembayaran' => ['nullable', 'string', Rule::in([
                Pembayaran::STATUS_SEBAGIAN,
                Pembayaran::STATUS_LUNAS,
                Pembayaran::STATUS_GAGAL,
                Pembayaran::STATUS_DIKEMBALIKAN,
            ])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();

        $query = Pembayaran::query()
            ->with('transaksi')
            ->when($validated['id_transaksi'] ?? null, fn ($query, $id) => $query->where('id_transaksi', $id))
            ->when($validated['status_pembayaran'] ?? null, fn ($query, $status) => $query->where('status_pembayaran', $status));

        if (! $user->isAdmin()) {
            if (! $user->id_kasir) {
                abort(403, 'Akun kasir belum terhubung ke data kasir.');
            }

            $query->whereHas('transaksi', fn ($query) => $query->where('id_kasir', $user->id_kasir));
        }

        return PembayaranResource::collection(
            $query->orderByDesc('tanggal_pembayaran')->paginate($validated['per_page'] ?? 15)->withQueryString()
        );
    }

    public function store(StorePembayaranRequest $request, Transaksi $transaksi): JsonResponse
    {
        $this->ensureCanAccessTransaksi($request, $transaksi);

        $data = $request->validated();

        $pembayaran = DB::transaction(function () use ($transaksi, $data) {
            $locked = Transaksi::whereKey($transaksi->id_transaksi)->lockForUpdate()->firstOrFail();

            if ($locked->status === Transaksi::STATUS_DIBATALKAN) {
                abort(409, 'Transaksi yang dibatalkan tidak dapat menerima pembayaran.');
            }

            $paid = (float) $locked->pembayaran()
                ->whereIn('status_pembayaran', [Pembayaran::STATUS_SEBAGIAN, Pembayaran::STATUS_LUNAS])
                ->sum('jumlah_bayar');

            $remaining = round((float) $locked->total - $paid, 2);

            if ($remaining <= 0) {
                abort(409, 'Transaksi sudah lunas.');
            }

            $amount = round((float) $data['jumlah_bayar'], 2);

            if ($amount > $remaining + 0.001) {
                throw ValidationException::withMessages([
                    'jumlah_bayar' => [
                        'Jumlah pembayaran melebihi sisa tagihan Rp '.number_format($remaining, 2, ',', '.').'.',
                    ],
                ]);
            }

            $isFull = abs($amount - $remaining) <= 0.001;

            $pembayaran = $locked->pembayaran()->create([
                'metode_pembayaran' => $data['metode_pembayaran'],
                'jumlah_bayar' => $amount,
                'status_pembayaran' => $isFull ? Pembayaran::STATUS_LUNAS : Pembayaran::STATUS_SEBAGIAN,
                'tanggal_pembayaran' => now(),
            ]);

            if ($isFull) {
                $locked->update(['status' => Transaksi::STATUS_DIBAYAR]);
            }

            return $pembayaran;
        });

        $pembayaran->load('transaksi');

        AuditLogger::log('pembayaran.created', 'pembayaran', $pembayaran->id_pembayaran, [
            'id_transaksi' => $pembayaran->id_transaksi,
            'metode' => $pembayaran->metode_pembayaran,
            'jumlah' => $pembayaran->jumlah_bayar,
            'status' => $pembayaran->status_pembayaran,
        ]);

        return (new PembayaranResource($pembayaran))
            ->additional(['message' => 'Pembayaran berhasil dicatat.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Pembayaran $pembayaran): PembayaranResource
    {
        $this->ensureCanAccessTransaksi($request, $pembayaran->transaksi);

        $pembayaran->load('transaksi');

        return new PembayaranResource($pembayaran);
    }
}
