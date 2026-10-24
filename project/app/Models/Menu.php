<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Menu extends Model
{
    protected $table = 'menu';

    protected $primaryKey = 'id_menu';

    protected $fillable = ['nama_menu', 'harga'];

    protected function casts(): array
    {
        return [
            'harga' => 'decimal:2',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'id_menu';
    }

    public function detailTransaksi(): HasMany
    {
        return $this->hasMany(DetailTransaksi::class, 'id_menu', 'id_menu');
    }
}
