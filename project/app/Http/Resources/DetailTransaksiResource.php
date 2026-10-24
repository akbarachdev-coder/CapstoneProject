<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DetailTransaksiResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_detail' => $this->id_detail,
            'id_transaksi' => $this->id_transaksi,
            'id_menu' => $this->id_menu,
            'menu' => new MenuResource($this->whenLoaded('menu')),
            'jumlah' => $this->jumlah,
            'harga_satuan' => $this->harga_satuan,
            'subtotal' => $this->subtotal,
        ];
    }
}
