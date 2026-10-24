<?php

namespace App\Http\Requests\Reservasi;

use App\Models\Reservasi;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateReservasiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_pelanggan' => ['sometimes', 'required', 'integer', 'exists:pelanggan,id_pelanggan'],
            'tgl_reservasi' => ['sometimes', 'required', 'date', 'after_or_equal:today'],
            'waktu_reservasi' => ['sometimes', 'required', 'date_format:H:i'],
            'jml_orang' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
            'status_reservasi' => ['sometimes', 'required', 'string', Rule::in(Reservasi::STATUS)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $reservasi = $this->route('reservasi');
                $tanggal = $this->input('tgl_reservasi', $reservasi?->tgl_reservasi?->format('Y-m-d'));
                $waktu = $this->input('waktu_reservasi', $reservasi?->waktu_reservasi);

                if (! $tanggal || ! $waktu) {
                    return;
                }

                if (Carbon::parse($tanggal.' '.$waktu)->isPast()
                    && $reservasi?->status_reservasi !== Reservasi::STATUS_SELESAI) {
                    $validator->errors()->add('waktu_reservasi', 'Waktu reservasi tidak boleh di masa lalu.');
                }
            },
        ];
    }
}
