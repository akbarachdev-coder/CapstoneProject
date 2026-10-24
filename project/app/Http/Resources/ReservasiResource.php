<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservasiResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_reservasi' => $this->id_reservasi,
            'id_pelanggan' => $this->id_pelanggan,
            'pelanggan' => new PelangganResource($this->whenLoaded('pelanggan')),
            'tgl_reservasi' => $this->tgl_reservasi?->format('Y-m-d'),
            'waktu_reservasi' => $this->waktu_reservasi,
            'jml_orang' => $this->jml_orang,
            'status_reservasi' => $this->status_reservasi,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
