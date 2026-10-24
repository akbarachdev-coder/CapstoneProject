<?php

namespace App\Http\Controllers\Api;

use App\Models\Pembayaran;
use App\Models\Transaksi;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaporanController extends ApiController
{
    public function penjualan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dari' => ['nullable', 'date'],
            'sampai' => ['nullable', 'date', 'after_or_equal:dari'],
        ]);

        $dari = Carbon::parse($validated['dari'] ?? now())->startOfDay();
        $sampai = Carbon::parse($validated['sampai'] ?? now())->endOfDay();

        if ($dari->diffInDays($sampai) > 31) {
            return response()->json([
                'message' => 'Rentang laporan maksimal 31 hari.',
            ], 422);
        }

        $base = Transaksi::query()
            ->whereBetween('tanggal', [$dari, $sampai])
            ->where('status', '!=', Transaksi::STATUS_DIBATALKAN);

        $ringkasan = (clone $base)
            ->selectRaw('COUNT(*) as jumlah_transaksi, COALESCE(SUM(total), 0) as total_penjualan')
            ->first();

        $perHari = (clone $base)
            ->selectRaw('DATE(tanggal) as tanggal, COUNT(*) as jumlah_transaksi, COALESCE(SUM(total), 0) as total_penjualan')
            ->groupBy('tanggal')
            ->orderBy('tanggal')
            ->get();

        $perMetode = Pembayaran::query()
            ->whereIn('status_pembayaran', [Pembayaran::STATUS_SEBAGIAN, Pembayaran::STATUS_LUNAS])
            ->whereHas('transaksi', function ($query) use ($dari, $sampai) {
                $query->whereBetween('tanggal', [$dari, $sampai])
                    ->where('status', '!=', Transaksi::STATUS_DIBATALKAN);
            })
            ->selectRaw('metode_pembayaran, COUNT(*) as jumlah_pembayaran, COALESCE(SUM(jumlah_bayar), 0) as total')
            ->groupBy('metode_pembayaran')
            ->get();

        return response()->json([
            'data' => [
                'periode' => [
                    'dari' => $dari->toDateString(),
                    'sampai' => $sampai->toDateString(),
                ],
                'ringkasan' => [
                    'jumlah_transaksi' => (int) $ringkasan->jumlah_transaksi,
                    'total_penjualan' => (float) $ringkasan->total_penjualan,
                ],
                'per_hari' => $perHari,
                'per_metode_pembayaran' => $perMetode,
            ],
        ]);
    }
}
