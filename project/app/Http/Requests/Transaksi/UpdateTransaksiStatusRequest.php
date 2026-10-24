<?php

namespace App\Http\Requests\Transaksi;

use App\Models\Transaksi;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransaksiStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in([
                Transaksi::STATUS_PENDING,
                Transaksi::STATUS_DIBAYAR,
                Transaksi::STATUS_DIBATALKAN,
            ])],
        ];
    }
}
