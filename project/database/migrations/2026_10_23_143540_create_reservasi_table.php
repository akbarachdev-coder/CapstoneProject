<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservasi', function (Blueprint $table) {
            $table->id('id_reservasi');

            $table->foreignId('id_pelanggan')
                ->constrained('pelanggan', 'id_pelanggan')
                ->restrictOnDelete();

            $table->date('tgl_reservasi');
            $table->time('waktu_reservasi');
            $table->unsignedInteger('jml_orang');
            $table->string('status_reservasi', 30)
                ->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservasi');
    }
};