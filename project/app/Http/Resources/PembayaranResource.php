<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PembayaranResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_pembayaran' => $this->id_pembayaran,
            'id_transaksi' => $this->id_transaksi,
            'metode_pembayaran' => $this->metode_pembayaran,
            'jumlah_bayar' => $this->jumlah_bayar,
            'status_pembayaran' => $this->status_pembayaran,
            'tanggal_pembayaran' => $this->tanggal_pembayaran?->toIso8601String(),
            'transaksi' => new TransaksiResource($this->whenLoaded('transaksi')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
