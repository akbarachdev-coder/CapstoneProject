import { authApi, ApiError } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { setButtonLoading, toast } from '../lib/ui.js';

const brand = `
    <div class="flex items-center gap-3">
        <span class="flex size-11 items-center justify-center rounded-2xl bg-cream-50 text-coffee-900 shadow-lg shadow-black/20">
            ${icon('cup', 'size-6')}
        </span>
        <span>
            <span class="block font-display text-xl font-semibold leading-tight tracking-tight">Titik Temu</span>
            <span class="block text-[10px] font-semibold tracking-[0.22em] text-coffee-300 uppercase">Coffee &amp; Eatery</span>
        </span>
    </div>
`;

const features = [
    ['receipt', 'Catat pesanan dalam hitungan detik', 'Kelola transaksi, pembayaran bertahap, dan status pesanan.'],
    ['chart', 'Laporan penjualan yang rapi', 'Pantau omzet harian dan metode pembayaran favorit pelanggan.'],
    ['users', 'Kelola akses staf dengan mudah', 'Atur akun admin dan kasir sesuai kebutuhan operasional kafe.'],
];

export function renderLogin(root, { onSuccess, onRegister = null, onCustomer = null, initialEmail = '', notice = '' }) {
    root.innerHTML = `
        <div class="grid min-h-screen lg:grid-cols-[1.08fr_1fr]">
            <section class="relative hidden overflow-hidden bg-coffee-950 p-10 text-cream-50 lg:flex lg:flex-col lg:justify-between xl:p-14">
                <div class="pointer-events-none absolute inset-0 bg-grain opacity-60"></div>
                <div class="pointer-events-none absolute -top-32 -right-32 size-[30rem] rounded-full bg-clay-500/20 blur-3xl"></div>
                <div class="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-sage-500/15 blur-3xl"></div>

                <div class="relative z-10">
                    ${brand}
                </div>

                <div class="relative z-10 my-10 max-w-xl">
                    <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-clay-200 uppercase backdrop-blur">
                        ${icon('sparkles', 'size-3.5')} Digitalisasi pencatatan transaksi
                    </p>
                    <h1 class="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance xl:text-5xl">
                        Setiap cangkir punya cerita.<br>
                        <span class="text-clay-200">Kami bantu mencatatnya.</span>
                    </h1>
                    <p class="mt-5 max-w-md text-sm leading-relaxed text-coffee-200/80">
                        Satu tempat untuk mengelola pesanan, pelanggan, menu, dan laporan Café Titik Temu.
                    </p>

                    <div class="mt-10 space-y-4">
                        ${features.map(([iconName, title, description]) => `
                            <div class="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4 backdrop-blur-sm transition hover:bg-white/[0.06]">
                                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-clay-500/15 text-clay-200">
                                    ${icon(iconName, 'size-5')}
                                </span>
                                <div>
                                    <p class="text-sm font-semibold text-cream-50">${escapeHtml(title)}</p>
                                    <p class="mt-0.5 text-xs leading-relaxed text-coffee-300/80">${escapeHtml(description)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="relative z-10 flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-coffee-300/70">
                    <p>© ${new Date().getFullYear()} Café Titik Temu</p>
                    <p class="flex items-center gap-1.5">
                        <span class="size-1.5 rounded-full bg-sage-400"></span>
                        Sistem siap digunakan
                    </p>
                </div>
            </section>

            <section class="flex min-h-screen flex-col bg-cream-100 px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
                <div class="flex items-center justify-between lg:hidden">
                    <div class="text-coffee-900">${brand}</div>
                    <span class="badge-neutral">Portal staf</span>
                </div>

                <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
                    <div class="mb-8">
                        <p class="section-eyebrow">Selamat datang kembali</p>
                        <h2 class="font-display text-3xl font-semibold tracking-tight text-coffee-900 sm:text-4xl">
                            Masuk ke meja kerja Anda
                        </h2>
                        <p class="mt-3 text-sm leading-relaxed text-coffee-500">
                            Gunakan akun yang diberikan oleh administrator untuk mengakses dashboard Titik Temu.
                        </p>
                    </div>

                    ${notice ? `
                        <div class="mb-5 flex items-start gap-3 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-700" role="status">
                            <span class="mt-0.5 shrink-0">${icon('checkCircle', 'size-4.5')}</span>
                            <p>${escapeHtml(notice)}</p>
                        </div>
                    ` : ''}

                    <div id="login-alert" class="mb-5 hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert"></div>

                    <form id="login-form" novalidate class="space-y-5">
                        <div>
                            <label for="email" class="field-label">Alamat email</label>
                            <div class="relative">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-coffee-300">
                                    ${icon('mail', 'size-4.5')}
                                </span>
                                <input id="email" name="email" type="email" autocomplete="username" required
                                    class="input h-12 pl-11" placeholder="nama@titiktemu.id" value="${escapeHtml(initialEmail)}">
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between">
                                <label for="password" class="field-label">Kata sandi</label>
                                <span class="text-[11px] text-coffee-400">Min. 12 karakter</span>
                            </div>
                            <div class="relative">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-coffee-300">
                                    ${icon('lock', 'size-4.5')}
                                </span>
                                <input id="password" name="password" type="password" autocomplete="current-password" required
                                    class="input h-12 pr-11 pl-11" placeholder="Masukkan kata sandi">
                                <button type="button" id="toggle-password" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-coffee-400 transition hover:text-coffee-700" aria-label="Tampilkan kata sandi">
                                    ${icon('eye', 'size-4.5')}
                                </button>
                            </div>
                        </div>

                        <button type="submit" id="login-submit" class="btn-primary h-12 w-full text-[15px]">
                            ${icon('arrowRight', 'size-4.5')}
                            Masuk ke dashboard
                        </button>
                    </form>

                    <p class="mt-6 text-center text-sm text-coffee-500">
                        Belum punya akun?
                        <button type="button" id="go-register" class="font-semibold text-clay-600 transition hover:text-clay-700">
                            Daftar sekarang
                        </button>
                    </p>

                    <div class="my-6 flex items-center gap-3">
                        <span class="h-px flex-1 bg-coffee-200"></span>
                        <span class="text-[10px] font-semibold tracking-[0.16em] text-coffee-300 uppercase">atau</span>
                        <span class="h-px flex-1 bg-coffee-200"></span>
                    </div>

                    <button type="button" id="go-customer" class="btn-secondary h-11 w-full">
                        ${icon('bag', 'size-4')}
                        Pesan sebagai pelanggan
                    </button>
                    <p class="mt-2 text-center text-[11px] text-coffee-400">Tanpa akun. Pilih menu, pesan, lalu bayar.</p>

                    <div class="mt-8 flex items-start gap-3 rounded-2xl border border-coffee-200/70 bg-white/60 p-4">
                        <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-coffee-100 text-coffee-600">
                            ${icon('shield', 'size-4.5')}
                        </span>
                        <p class="text-xs leading-relaxed text-coffee-500">
                            <span class="font-semibold text-coffee-700">Akses aman.</span>
                            Sesi Anda berlaku selama 8 jam. Hubungi admin kafe jika lupa kata sandi atau akun dinonaktifkan.
                        </p>
                    </div>
                </div>

                <div class="mx-auto flex w-full max-w-md items-center justify-between border-t border-coffee-200/70 pt-5 text-[11px] text-coffee-400">
                    <p>Café Titik Temu · Sistem internal</p>
                    <p>v1.0</p>
                </div>
            </section>
        </div>
    `;

    const form = root.querySelector('#login-form');
    const submit = root.querySelector('#login-submit');
    const alert = root.querySelector('#login-alert');
    const password = root.querySelector('#password');
    const toggle = root.querySelector('#toggle-password');

    root.querySelector('#go-register')?.addEventListener('click', () => onRegister?.());
    root.querySelector('#go-customer')?.addEventListener('click', () => onCustomer?.());

    toggle.addEventListener('click', () => {
        const isPassword = password.type === 'password';
        password.type = isPassword ? 'text' : 'password';
        toggle.innerHTML = icon(isPassword ? 'eyeOff' : 'eye', 'size-4.5');
        toggle.setAttribute('aria-label', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    });

    const showError = (message) => {
        alert.textContent = message;
        alert.classList.remove('hidden');
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        alert.classList.add('hidden');

        const email = form.email.value.trim();
        const pass = form.password.value;

        if (!email || !pass) {
            showError('Email dan kata sandi wajib diisi.');
            return;
        }

        setButtonLoading(submit, true, 'Memeriksa akun...');

        try {
            const auth = await authApi.login(email, pass);
            toast(`Senang melihat Anda lagi, ${auth.user.name}.`, 'success', 'Berhasil masuk');
            onSuccess(auth.user);
        } catch (error) {
            const message = error instanceof ApiError
                ? (error.status === 401 ? 'Email atau kata sandi salah. Periksa kembali.' : (error.firstError || error.message))
                : 'Terjadi kesalahan. Silakan coba lagi.';
            showError(message);
            setButtonLoading(submit, false);
            submit.innerHTML = `${icon('arrowRight', 'size-4.5')} Masuk ke dashboard`;
        }
    });
}
