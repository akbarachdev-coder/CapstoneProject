<?php

namespace App\Http\Requests\Pelanggan;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePelangganRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nama_pelanggan' => ['sometimes', 'required', 'string', 'max:100'],
            'no_hp' => ['sometimes', 'required', 'string', 'max:15', 'regex:/^(\+62|62|0)8[1-9][0-9]{6,11}$/'],
        ];
    }
}
