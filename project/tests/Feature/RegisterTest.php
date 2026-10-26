<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_normalized_email_and_role(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => '  Kasir Baru  ',
            'email' => 'Kasir@TitikTemu.Test',
            'password' => 'Rahasia#Temu2026',
            'password_confirmation' => 'Rahasia#Temu2026',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Kasir Baru')
            ->assertJsonPath('data.email', 'kasir@titiktemu.test')
            ->assertJsonPath('data.role', User::ROLE_KASIR)
            ->assertJsonPath('data.is_active', true);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir@titiktemu.test',
            'password' => 'Rahasia#Temu2026',
        ])->assertOk()
            ->assertJsonPath('data.user.email', 'kasir@titiktemu.test');
    }

    public function test_registration_rejects_case_insensitive_duplicate_email(): void
    {
        User::create([
            'name' => 'Kasir Lama',
            'email' => 'kasir@titiktemu.test',
            'password' => 'Rahasia#Temu2026',
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Kasir Baru',
            'email' => 'KASIR@TITIKTEMU.TEST',
            'password' => 'Rahasia#Temu2026',
            'password_confirmation' => 'Rahasia#Temu2026',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_registration_requires_a_strong_password(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Kasir Baru',
            'email' => 'baru@titiktemu.test',
            'password' => 'pendek',
            'password_confirmation' => 'pendek',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }
}
