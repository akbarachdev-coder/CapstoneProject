<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_api_flow_and_access_control(): void
    {
        $admin = new User([
            'name' => 'Admin',
            'email' => 'admin@titiktemu.test',
            'password' => 'Rahasia#Temu2026',
            'is_active' => true,
        ]);
        $admin->role = User::ROLE_ADMIN;
        $admin->save();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@titiktemu.test',
            'password' => 'Rahasia#Temu2026',
        ])->assertOk();

        $adminToken = $login->json('data.token');
        $this->assertNotEmpty($adminToken);

        $adminHeaders = ['Authorization' => 'Bearer '.$adminToken];

        $kasir = $this->postJson('/api/v1/kasir', [
            'nama_kasir' => 'Kasir Satu',
            'email' => 'kasir1@titiktemu.test',
            'password' => 'Kasir#Temu2026',
            'password_confirmation' => 'Kasir#Temu2026',
        ], $adminHeaders)->assertCreated();

        $idKasir = $kasir->json('data.id_kasir');

        $kasirDua = $this->postJson('/api/v1/kasir', [
            'nama_kasir' => 'Kasir Dua',
            'email' => 'kasir2@titiktemu.test',
            'password' => 'Kasir#Temu2026',
            'password_confirmation' => 'Kasir#Temu2026',
        ], $adminHeaders)->assertCreated();

        $idKasirDua = $kasirDua->json('data.id_kasir');

        $menu = $this->postJson('/api/v1/menu', [
            'nama_menu' => 'Kopi Susu',
            'harga' => 18000,
        ], $adminHeaders)->assertCreated();

        $idMenu = $menu->json('data.id_menu');

        $pelanggan = $this->postJson('/api/v1/pelanggan', [
            'nama_pelanggan' => 'Budi',
            'no_hp' => '081234567890',
        ], $adminHeaders)->assertCreated();

        $idPelanggan = $pelanggan->json('data.id_pelanggan');

        $transaksi = $this->postJson('/api/v1/transaksi', [
            'id_kasir' => $idKasir,
            'id_pelanggan' => $idPelanggan,
            'items' => [
                ['id_menu' => $idMenu, 'jumlah' => 2],
            ],
        ], $adminHeaders)->assertCreated();

        $this->assertSame('36000.00', $transaksi->json('data.total'));
        $this->assertSame($idKasir, $transaksi->json('data.id_kasir'));

        $idTransaksi = $transaksi->json('data.id_transaksi');

        $this->postJson("/api/v1/transaksi/{$idTransaksi}/pembayaran", [
            'metode_pembayaran' => 'tunai',
            'jumlah_bayar' => 40000,
        ], $adminHeaders)->assertStatus(422);

        $this->postJson("/api/v1/transaksi/{$idTransaksi}/pembayaran", [
            'metode_pembayaran' => 'qris',
            'jumlah_bayar' => 20000,
        ], $adminHeaders)->assertCreated();

        $this->getJson("/api/v1/transaksi/{$idTransaksi}", $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        $this->postJson("/api/v1/transaksi/{$idTransaksi}/pembayaran", [
            'metode_pembayaran' => 'tunai',
            'jumlah_bayar' => 16000,
        ], $adminHeaders)->assertCreated();

        $this->getJson("/api/v1/transaksi/{$idTransaksi}", $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.status', 'dibayar');

        $kasirLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir1@titiktemu.test',
            'password' => 'Kasir#Temu2026',
        ])->assertOk();

        $kasirHeaders = ['Authorization' => 'Bearer '.$kasirLogin->json('data.token')];
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/v1/menu', [
            'nama_menu' => 'Tidak Boleh',
            'harga' => 1000,
        ], $kasirHeaders)->assertForbidden();

        $kasirTransaksi = $this->postJson('/api/v1/transaksi', [
            'id_kasir' => $idKasirDua,
            'items' => [
                ['id_menu' => $idMenu, 'jumlah' => 1],
            ],
        ], $kasirHeaders)->assertCreated();

        $this->assertSame($idKasir, $kasirTransaksi->json('data.id_kasir'));

        $this->getJson('/api/v1/transaksi/'.$kasirTransaksi->json('data.id_transaksi'), $kasirHeaders)
            ->assertOk();

        $this->getJson('/api/v1/laporan/penjualan', $kasirHeaders)->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/laporan/penjualan', $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.ringkasan.jumlah_transaksi', 2);

        $this->postJson('/api/v1/auth/logout', [], $adminHeaders)->assertOk();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/auth/me', $adminHeaders)->assertUnauthorized();
    }

    public function test_inactive_account_cannot_login(): void
    {
        $user = new User([
            'name' => 'Nonaktif',
            'email' => 'nonaktif@titiktemu.test',
            'password' => 'Rahasia#Temu2026',
            'is_active' => false,
        ]);
        $user->role = User::ROLE_KASIR;
        $user->save();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'nonaktif@titiktemu.test',
            'password' => 'Rahasia#Temu2026',
        ])->assertUnauthorized();
    }
}
