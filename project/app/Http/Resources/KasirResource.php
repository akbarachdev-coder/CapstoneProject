<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KasirResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_kasir' => $this->id_kasir,
            'nama_kasir' => $this->nama_kasir,
            'user' => new UserResource($this->whenLoaded('user')),
            'jumlah_transaksi' => $this->whenCounted('transaksi'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
