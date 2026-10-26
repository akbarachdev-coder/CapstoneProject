<?php

namespace Tests\Feature;

use App\Models\Kasir;
use App\Models\Menu;
use App\Models\Pelanggan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderTest extends TestCase
{
    use RefreshDatabase;

    private function menu(string $name, float $price): Menu
    {
        return Menu::create([
            'nama_menu' => $name,
            'harga' => $price,
        ]);
    }

    private function kasirAccount(string $name = 'Kasir Test'): User
    {
        $kasir = Kasir::create(['nama_kasir' => $name]);

        $user = User::create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '.', $name)).'@titiktemu.test',
            'password' => 'Kasir#Temu2026',
            'is_active' => true,
            'id_kasir' => $kasir->id_kasir,
        ]);

        $user->role = User::ROLE_KASIR;
        $user->save();

        return $user;
    }

    public function test_menu_is_public_for_customer_portal(): void
    {
        $this->menu('Kopi Susu', 18000);

        $this->getJson('/api/v1/menu')
            ->assertOk()
            ->assertJsonPath('data.0.nama_menu', 'Kopi Susu');
    }

    public function test_guest_can_create_order_and_pay_in_full(): void
    {
        $kopi = $this->menu('Kopi Susu', 18000);
        $roti = $this->menu('Roti Bakar', 18000);

        $response = $this->postJson('/api/v1/pelanggan/pesanan', [
            'nama_pelanggan' => 'Siti',
            'no_hp' => '081234567890',
            'items' => [
                ['id_menu' => $kopi->id_menu, 'jumlah' => 2],
                ['id_menu' => $roti->id_menu, 'jumlah' => 1],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.id_kasir', null)
            ->assertJsonPath('data.status', Transaksi::STATUS_PENDING)
            ->assertJsonPath('data.total', '54000.00')
            ->assertJsonStructure([
                'data' => [
                    'id_transaksi',
                    'kode_pesanan',
                    'pelanggan' => ['nama_pelanggan', 'no_hp'],
                    'details',
                ],
            ]);

        $kode = $response->json('data.kode_pesanan');
        $idTransaksi = $response->json('data.id_transaksi');

        $this->assertNotEmpty($kode);

        $this->assertDatabaseHas('transaksi', [
            'id_transaksi' => $idTransaksi,
            'kode_pesanan' => $kode,
            'id_kasir' => null,
            'total' => 54000,
        ]);

        $this->assertDatabaseHas('pelanggan', [
            'nama_pelanggan' => 'Siti',
            'no_hp' => '081234567890',
        ]);

        $this->getJson("/api/v1/pelanggan/pesanan/{$kode}")
            ->assertOk()
            ->assertJsonPath('data.total', '54000.00')
            ->assertJsonCount(2, 'data.details');

        $this->postJson("/api/v1/pelanggan/pesanan/{$kode}/pembayaran", [
            'metode_pembayaran' => 'qris',
            'jumlah_bayar' => 54000,
        ])->assertCreated()
            ->assertJsonPath('data.pembayaran.status_pembayaran', 'lunas')
            ->assertJsonPath('data.transaksi.status', Transaksi::STATUS_DIBAYAR);

        $this->getJson("/api/v1/pelanggan/pesanan/{$kode}")
            ->assertOk()
            ->assertJsonPath('data.status', Transaksi::STATUS_DIBAYAR)
            ->assertJsonCount(1, 'data.pembayaran');
    }

    public function test_guest_can_pay_in_partial_amounts_and_reuse_customer_by_phone(): void
    {
        $menu = $this->menu('Latte', 25000);

        $first = $this->postJson('/api/v1/pelanggan/pesanan', [
            'nama_pelanggan' => 'Andi',
            'no_hp' => '081298765432',
            'items' => [['id_menu' => $menu->id_menu, 'jumlah' => 2]],
        ])->assertCreated();

        $kode = $first->json('data.kode_pesanan');

        $this->postJson("/api/v1/pelanggan/pesanan/{$kode}/pembayaran", [
            'metode_pembayaran' => 'tunai',
            'jumlah_bayar' => 20000,
        ])->assertCreated()
            ->assertJsonPath('data.pembayaran.status_pembayaran', 'sebagian')
            ->assertJsonPath('data.transaksi.status', Transaksi::STATUS_PENDING);

        $this->postJson('/api/v1/pelanggan/pesanan', [
            'nama_pelanggan' => 'Andi Wijaya',
            'no_hp' => '081298765432',
            'items' => [['id_menu' => $menu->id_menu, 'jumlah' => 1]],
        ])->assertCreated();

        $this->assertSame(1, Pelanggan::query()->where('no_hp', '081298765432')->count());
        $this->assertDatabaseHas('pelanggan', [
            'no_hp' => '081298765432',
            'nama_pelanggan' => 'Andi Wijaya',
        ]);

        $this->postJson("/api/v1/pelanggan/pesanan/{$kode}/pembayaran", [
            'metode_pembayaran' => 'qris',
            'jumlah_bayar' => 30000,
        ])->assertCreated()
            ->assertJsonPath('data.transaksi.status', Transaksi::STATUS_DIBAYAR);
    }

    public function test_customer_order_validation_and_unknown_code(): void
    {
        $menu = $this->menu('Espresso', 15000);

        $this->postJson('/api/v1/pelanggan/pesanan', [
            'nama_pelanggan' => 'Tanpa HP',
            'no_hp' => '12345',
            'items' => [['id_menu' => $menu->id_menu, 'jumlah' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors('no_hp');

        $this->postJson('/api/v1/pelanggan/pesanan', [
            'nama_pelanggan' => 'Tanpa Item',
            'no_hp' => '081211112222',
            'items' => [],
        ])->assertStatus(422)->assertJsonValidationErrors('items');

        $this->getJson('/api/v1/pelanggan/pesanan/kode-tidak-ada')->assertNotFound();
    }

    public function test_kasir_can_see_and_pay_online_orders(): void
    {
        $menu = $this->menu('Mocha', 30000);
        $kasir = $this->kasirAccount();

        $order = $this->postJson('/api/v1/pelanggan/pesanan', [
            'nama_pelanggan' => 'Rina',
            'no_hp' => '081277778888',
            'items' => [['id_menu' => $menu->id_menu, 'jumlah' => 1]],
        ])->assertCreated();

        $kode = $order->json('data.kode_pesanan');
        $idTransaksi = $order->json('data.id_transaksi');

        Sanctum::actingAs($kasir);

        $list = $this->getJson('/api/v1/transaksi')->assertOk();
        $this->assertContains($kode, collect($list->json('data'))->pluck('kode_pesanan')->all());

        $this->getJson("/api/v1/transaksi/{$idTransaksi}")
            ->assertOk()
            ->assertJsonPath('data.kode_pesanan', $kode);

        $this->postJson("/api/v1/transaksi/{$idTransaksi}/pembayaran", [
            'metode_pembayaran' => 'transfer',
            'jumlah_bayar' => 30000,
        ])->assertCreated()
            ->assertJsonPath('data.transaksi.status', Transaksi::STATUS_DIBAYAR);

        $payments = $this->getJson('/api/v1/pembayaran')->assertOk();
        $this->assertContains($idTransaksi, collect($payments->json('data'))->pluck('id_transaksi')->all());
    }
}
