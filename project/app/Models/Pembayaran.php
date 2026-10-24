<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    public const STATUS_SEBAGIAN = 'sebagian';

    public const STATUS_LUNAS = 'lunas';

    public const STATUS_GAGAL = 'gagal';

    public const STATUS_DIKEMBALIKAN = 'dikembalikan';

    public const METODE = ['tunai', 'qris', 'debit', 'kredit', 'transfer', 'e-wallet'];

    protected $table = 'pembayaran';

    protected $primaryKey = 'id_pembayaran';

    protected $fillable = [
        'id_transaksi',
        'metode_pembayaran',
        'jumlah_bayar',
        'status_pembayaran',
        'tanggal_pembayaran',
    ];

    protected function casts(): array
    {
        return [
            'jumlah_bayar' => 'decimal:2',
            'tanggal_pembayaran' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'id_pembayaran';
    }

    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'id_transaksi', 'id_transaksi');
    }
}
