<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->string('kode_pesanan', 40)->nullable()->unique()->after('id_transaksi');
            $table->foreignId('id_kasir')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropUnique(['kode_pesanan']);
            $table->dropColumn('kode_pesanan');
            $table->foreignId('id_kasir')->nullable(false)->change();
        });
    }
};
