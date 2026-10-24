<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransaksiResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_transaksi' => $this->id_transaksi,
            'id_kasir' => $this->id_kasir,
            'kasir' => new KasirResource($this->whenLoaded('kasir')),
            'id_pelanggan' => $this->id_pelanggan,
            'pelanggan' => new PelangganResource($this->whenLoaded('pelanggan')),
            'tanggal' => $this->tanggal?->toIso8601String(),
            'total' => $this->total,
            'status' => $this->status,
            'details' => DetailTransaksiResource::collection($this->whenLoaded('details')),
            'pembayaran' => PembayaranResource::collection($this->whenLoaded('pembayaran')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
