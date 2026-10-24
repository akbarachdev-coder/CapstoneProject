<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservasi extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_DIKONFIRMASI = 'dikonfirmasi';

    public const STATUS_SELESAI = 'selesai';

    public const STATUS_DIBATALKAN = 'dibatalkan';

    public const STATUS = [
        self::STATUS_PENDING,
        self::STATUS_DIKONFIRMASI,
        self::STATUS_SELESAI,
        self::STATUS_DIBATALKAN,
    ];

    protected $table = 'reservasi';

    protected $primaryKey = 'id_reservasi';

    protected $fillable = [
        'id_pelanggan',
        'tgl_reservasi',
        'waktu_reservasi',
        'jml_orang',
        'status_reservasi',
    ];

    protected function casts(): array
    {
        return [
            'tgl_reservasi' => 'date:Y-m-d',
            'jml_orang' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'id_reservasi';
    }

    public function pelanggan(): BelongsTo
    {
        return $this->belongsTo(Pelanggan::class, 'id_pelanggan', 'id_pelanggan');
    }
}
