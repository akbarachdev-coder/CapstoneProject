<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KasirController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PelangganController;
use App\Http\Controllers\Api\PembayaranController;
use App\Http\Controllers\Api\PesananPelangganController;
use App\Http\Controllers\Api\ReservasiController;
use App\Http\Controllers\Api\TransaksiController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('menu', [MenuController::class, 'index'])->middleware('throttle:60,1');
    Route::get('menu/{menu}', [MenuController::class, 'show'])->middleware('throttle:60,1');

    Route::prefix('pelanggan')->middleware('throttle:30,1')->group(function () {
        Route::post('pesanan', [PesananPelangganController::class, 'store']);
        Route::get('pesanan/{kode}', [PesananPelangganController::class, 'show']);
        Route::post('pesanan/{kode}/pembayaran', [PesananPelangganController::class, 'bayar']);
    });

    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:login');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::apiResource('pelanggan', PelangganController::class);

        Route::apiResource('menu', MenuController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware('role:admin');

        Route::patch('transaksi/{transaksi}/status', [TransaksiController::class, 'updateStatus'])
            ->middleware('role:admin');
        Route::apiResource('transaksi', TransaksiController::class)->except(['destroy']);
        Route::delete('transaksi/{transaksi}', [TransaksiController::class, 'destroy'])
            ->middleware('role:admin');

        Route::get('pembayaran', [PembayaranController::class, 'index']);
        Route::get('pembayaran/{pembayaran}', [PembayaranController::class, 'show']);
        Route::post('transaksi/{transaksi}/pembayaran', [PembayaranController::class, 'store']);

        Route::apiResource('reservasi', ReservasiController::class)->except(['destroy']);
        Route::delete('reservasi/{reservasi}', [ReservasiController::class, 'destroy'])
            ->middleware('role:admin');

        Route::middleware('role:admin')->group(function () {
            Route::apiResource('kasir', KasirController::class);
            Route::get('laporan/penjualan', [LaporanController::class, 'penjualan']);
            Route::get('laporan/pendapatan', [LaporanController::class, 'pendapatan']);
        });
    });
});
