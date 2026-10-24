<?php

namespace App\Http\Requests\Reservasi;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreReservasiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_pelanggan' => ['required', 'integer', 'exists:pelanggan,id_pelanggan'],
            'tgl_reservasi' => ['required', 'date', 'after_or_equal:today'],
            'waktu_reservasi' => ['required', 'date_format:H:i'],
            'jml_orang' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $waktu = Carbon::parse(
                    $this->input('tgl_reservasi').' '.$this->input('waktu_reservasi')
                );

                if ($waktu->isPast()) {
                    $validator->errors()->add('waktu_reservasi', 'Waktu reservasi tidak boleh di masa lalu.');
                }
            },
        ];
    }
}
