<?php

namespace App\Support;

use App\Models\Menu;
use Illuminate\Validation\ValidationException;

final class TransaksiDetailBuilder
{
    /**
     * @param  array<int, array{id_menu: int|string, jumlah: int|string}>  $items
     * @return array{0: array<int, array<string, int|float>>, 1: float}
     */
    public static function build(array $items): array
    {
        $menuIds = collect($items)->pluck('id_menu')->map(fn ($id) => (int) $id)->unique()->values();

        $menus = Menu::query()
            ->whereIn('id_menu', $menuIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id_menu');

        $details = [];
        $total = 0.0;

        foreach ($items as $item) {
            $menu = $menus->get((int) $item['id_menu']);

            if (! $menu) {
                throw ValidationException::withMessages([
                    'items' => ['Salah satu menu tidak ditemukan.'],
                ]);
            }

            $jumlah = (int) $item['jumlah'];
            $hargaSatuan = (float) $menu->harga;
            $subtotal = round($hargaSatuan * $jumlah, 2);
            $total = round($total + $subtotal, 2);

            $details[] = [
                'id_menu' => $menu->id_menu,
                'jumlah' => $jumlah,
                'harga_satuan' => $hargaSatuan,
                'subtotal' => $subtotal,
            ];
        }

        return [$details, $total];
    }
}
