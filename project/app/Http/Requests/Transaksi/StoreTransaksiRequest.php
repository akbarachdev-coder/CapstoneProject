<?php

namespace App\Http\Requests\Transaksi;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransaksiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_kasir' => ['nullable', 'integer', 'exists:kasir,id_kasir'],
            'id_pelanggan' => ['nullable', 'integer', 'exists:pelanggan,id_pelanggan'],
            'tanggal' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id_menu' => ['required', 'integer', 'distinct', 'exists:menu,id_menu'],
            'items.*.jumlah' => ['required', 'integer', 'min:1', 'max:999'],
        ];
    }
}
