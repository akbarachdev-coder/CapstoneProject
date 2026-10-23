<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id('id_pembayaran');

            $table->foreignId('id_transaksi')
                ->constrained('transaksi', 'id_transaksi')
                ->restrictOnDelete();

            $table->string('metode_pembayaran', 50);
            $table->decimal('jumlah_bayar', 12, 2);
            $table->string('status_pembayaran', 30)
                ->default('pending');
            $table->dateTime('tanggal_pembayaran')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
    }
};