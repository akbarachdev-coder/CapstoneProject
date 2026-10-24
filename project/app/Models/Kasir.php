<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Kasir extends Model
{
    protected $table = 'kasir';

    protected $primaryKey = 'id_kasir';

    protected $fillable = ['nama_kasir'];

    public function getRouteKeyName(): string
    {
        return 'id_kasir';
    }

    public function transaksi(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_kasir', 'id_kasir');
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'id_kasir', 'id_kasir');
    }
}
