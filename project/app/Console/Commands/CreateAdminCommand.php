<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdminCommand extends Command
{
    protected $signature = 'app:create-admin {email? : Email akun administrator} {--name= : Nama administrator}';

    protected $description = 'Membuat akun administrator pertama secara aman';

    public function handle(): int
    {
        $email = $this->argument('email') ?? $this->ask('Email administrator');

        $name = $this->option('name') ?: $this->ask('Nama administrator', 'Administrator');

        $password = $this->secret('Kata sandi (minimal 12 karakter, huruf besar/kecil, angka, simbol)');
        $confirmation = $this->secret('Ulangi kata sandi');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'max:72', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = new User([
            'name' => $name,
            'email' => strtolower($email),
            'password' => $password,
            'is_active' => true,
        ]);
        $user->role = User::ROLE_ADMIN;
        $user->save();

        $this->info("Akun administrator {$user->email} berhasil dibuat.");

        return self::SUCCESS;
    }
}
