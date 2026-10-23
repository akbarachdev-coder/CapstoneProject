<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaksi', function (Blueprint $table) {
            $table->id('id_transaksi');

            $table->foreignId('id_kasir')
                ->constrained('kasir', 'id_kasir')
                ->restrictOnDelete();

            $table->foreignId('id_pelanggan')
                ->nullable()
                ->constrained('pelanggan', 'id_pelanggan')
                ->nullOnDelete();

            $table->dateTime('tanggal');
            $table->decimal('total', 12, 2)->default(0);
            $table->string('status', 30)->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaksi');
    }
};
