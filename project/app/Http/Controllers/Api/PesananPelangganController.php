<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Pembayaran\StorePembayaranRequest;
use App\Http\Resources\PembayaranResource;
use App\Http\Resources\TransaksiResource;
use App\Models\Pelanggan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Support\AuditLogger;
use App\Support\TransaksiDetailBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PesananPelangganController extends ApiController
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_pelanggan' => ['required', 'string', 'max:100'],
            'no_hp' => ['required', 'string', 'max:15', 'regex:/^(\+62|62|0)8[1-9][0-9]{6,11}$/'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id_menu' => ['required', 'integer', 'distinct', 'exists:menu,id_menu'],
            'items.*.jumlah' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        $validated['nama_pelanggan'] = trim($validated['nama_pelanggan']);

        $transaksi = DB::transaction(function () use ($validated) {
            $pelanggan = Pelanggan::query()->firstOrCreate(
                ['no_hp' => $validated['no_hp']],
                ['nama_pelanggan' => $validated['nama_pelanggan']],
            );

            if ($pelanggan->nama_pelanggan !== $validated['nama_pelanggan']) {
                $pelanggan->update(['nama_pelanggan' => $validated['nama_pelanggan']]);
            }

            [$details, $total] = TransaksiDetailBuilder::build($validated['items']);

            $transaksi = Transaksi::create([
                'id_kasir' => null,
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'kode_pesanan' => (string) Str::uuid(),
                'tanggal' => now(),
                'total' => $total,
                'status' => Transaksi::STATUS_PENDING,
            ]);

            $transaksi->details()->createMany($details);

            return $transaksi;
        });

        $transaksi->load(['kasir', 'pelanggan', 'details.menu', 'pembayaran']);

        AuditLogger::log('pesanan_pelanggan.created', 'transaksi', $transaksi->id_transaksi, [
            'kode_pesanan' => $transaksi->kode_pesanan,
            'total' => $transaksi->total,
            'jumlah_item' => count($validated['items']),
        ]);

        return (new TransaksiResource($transaksi))
            ->additional(['message' => 'Pesanan berhasil dibuat.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(string $kode): TransaksiResource
    {
        $transaksi = Transaksi::query()
            ->where('kode_pesanan', $kode)
            ->with(['kasir', 'pelanggan', 'details.menu', 'pembayaran'])
            ->firstOrFail();

        return new TransaksiResource($transaksi);
    }

    public function bayar(StorePembayaranRequest $request, string $kode): JsonResponse
    {
        $data = $request->validated();

        [$pembayaran, $transaksi] = DB::transaction(function () use ($kode, $data) {
            $locked = Transaksi::query()
                ->where('kode_pesanan', $kode)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status === Transaksi::STATUS_DIBATALKAN) {
                abort(409, 'Pesanan yang dibatalkan tidak dapat menerima pembayaran.');
            }

            $paid = (float) $locked->pembayaran()
                ->whereIn('status_pembayaran', [Pembayaran::STATUS_SEBAGIAN, Pembayaran::STATUS_LUNAS])
                ->sum('jumlah_bayar');

            $remaining = round((float) $locked->total - $paid, 2);

            if ($remaining <= 0) {
                abort(409, 'Pesanan sudah lunas.');
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

            return [$pembayaran, $locked];
        });

        $pembayaran->load('transaksi');
        $transaksi->load(['kasir', 'pelanggan', 'details.menu', 'pembayaran']);

        AuditLogger::log('pesanan_pelanggan.paid', 'pembayaran', $pembayaran->id_pembayaran, [
            'id_transaksi' => $transaksi->id_transaksi,
            'kode_pesanan' => $transaksi->kode_pesanan,
            'metode' => $pembayaran->metode_pembayaran,
            'jumlah' => $pembayaran->jumlah_bayar,
        ]);

        return response()->json([
            'message' => 'Pembayaran berhasil dicatat.',
            'data' => [
                'pembayaran' => new PembayaranResource($pembayaran),
                'transaksi' => new TransaksiResource($transaksi),
            ],
        ], 201);
    }
}
