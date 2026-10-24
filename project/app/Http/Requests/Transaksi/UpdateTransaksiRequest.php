<?php

namespace App\Http\Requests\Transaksi;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransaksiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_pelanggan' => ['sometimes', 'nullable', 'integer', 'exists:pelanggan,id_pelanggan'],
            'tanggal' => ['sometimes', 'required', 'date'],
            'items' => ['sometimes', 'array', 'min:1', 'max:100'],
            'items.*.id_menu' => ['required', 'integer', 'distinct', 'exists:menu,id_menu'],
            'items.*.jumlah' => ['required', 'integer', 'min:1', 'max:999'],
        ];
    }
}
