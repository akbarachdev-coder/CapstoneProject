<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('kasir')->after('password')->index();
            $table->boolean('is_active')->default(true)->after('role');

            $table->foreignId('id_kasir')
                ->nullable()
                ->unique()
                ->after('is_active')
                ->constrained('kasir', 'id_kasir')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('id_kasir');
            $table->dropColumn(['role', 'is_active']);
        });
    }
};
