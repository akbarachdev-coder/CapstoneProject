<?php

namespace App\Http\Requests\Pembayaran;

use App\Models\Pembayaran;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePembayaranRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'metode_pembayaran' => ['required', 'string', Rule::in(Pembayaran::METODE)],
            'jumlah_bayar' => ['required', 'numeric', 'gt:0', 'max:999999999999.99', 'decimal:0,2'],
        ];
    }
}
