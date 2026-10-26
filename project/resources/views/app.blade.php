<!DOCTYPE html>
<html lang="id" class="h-full">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>Titik Temu · Kasir & Pencatatan Transaksi</title>
        <meta name="description" content="Sistem pencatatan transaksi, menu, pelanggan, reservasi, dan laporan Café Titik Temu.">
        <meta name="theme-color" content="#332016">

        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23332016'/%3E%3Cpath d='M18 24h24v12a12 12 0 0 1-12 12h0a12 12 0 0 1-12-12V24Z' fill='%23fbf6ee'/%3E%3Cpath d='M42 27h3a6 6 0 0 1 0 12h-3' fill='none' stroke='%23c07b4b' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M28 14c0 3-3 3-3 6M36 14c0 3-3 3-3 6' fill='none' stroke='%23c07b4b' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E">

        @fonts

        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="min-h-full font-sans text-coffee-900 antialiased">
        <div id="boot" class="fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-coffee-950 text-cream-50 transition-opacity duration-300">
            <div class="relative">
                <div class="absolute inset-0 animate-ping rounded-2xl bg-clay-500/20"></div>
                <div class="relative flex size-14 items-center justify-center rounded-2xl bg-cream-50 text-coffee-900 shadow-xl">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="size-7">
                        <path d="M5 8h12v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z"/>
                        <path d="M17 10h1.5a3 3 0 0 1 0 6H17"/>
                        <path d="M8 4c0 1.5-1.5 1.5-1.5 3M12 4c0 1.5-1.5 1.5-1.5 3"/>
                    </svg>
                </div>
            </div>
            <div class="text-center">
                <p class="font-display text-xl font-semibold tracking-tight">Titik Temu</p>
                <p class="mt-1 text-xs tracking-[0.18em] text-coffee-300 uppercase">Menyiapkan meja Anda</p>
            </div>
        </div>

        <div id="app"></div>

        <div id="toast-root" class="pointer-events-none fixed inset-x-3 top-3 z-80 flex flex-col items-end gap-2 sm:inset-x-auto sm:top-5 sm:right-5 sm:w-96"></div>

        <noscript>
            <div class="flex min-h-screen items-center justify-center p-6">
                <div class="card card-pad max-w-md text-center">
                    <h1 class="font-display text-xl font-semibold">JavaScript diperlukan</h1>
                    <p class="mt-2 text-sm text-coffee-500">Aktifkan JavaScript di peramban Anda untuk menggunakan aplikasi Titik Temu.</p>
                </div>
            </div>
        </noscript>
    </body>
</html>
