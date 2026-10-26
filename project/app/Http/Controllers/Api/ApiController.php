<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use Illuminate\Http\Request;

abstract class ApiController extends Controller
{
    protected function ensureCanAccessTransaksi(Request $request, Transaksi $transaksi): void
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return;
        }

        if ($transaksi->id_kasir === null) {
            return;
        }

        if (! $user->id_kasir || (int) $user->id_kasir !== (int) $transaksi->id_kasir) {
            abort(403, 'Anda tidak memiliki akses ke transaksi ini.');
        }
    }
}
