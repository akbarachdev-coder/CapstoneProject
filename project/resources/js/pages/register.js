import { authApi, ApiError } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { setButtonLoading } from '../lib/ui.js';

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

const steps = [
    ['user', 'Satu akun untuk semua peran', 'Admin mengelola menu dan laporan, kasir fokus melayani pesanan.'],
    ['receipt', 'Langsung siap bekerja', 'Setelah mendaftar Anda dapat mencatat transaksi dan pembayaran.'],
    ['shield', 'Data kafe tetap aman', 'Setiap aktivitas tercatat dan sesi Anda berlaku selama 8 jam.'],
];

export function renderRegister(root, { onSuccess, onLogin = null }) {
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
                        ${icon('sparkles', 'size-3.5')} Bergabung bersama Titik Temu
                    </p>
                    <h1 class="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance xl:text-5xl">
                        Mulai catat setiap cerita<br>
                        <span class="text-clay-200">dari meja Anda.</span>
                    </h1>
                    <p class="mt-5 max-w-md text-sm leading-relaxed text-coffee-200/80">
                        Buat akun kasir untuk mulai mengelola pesanan, pelanggan, reservasi, dan pembayaran di Café Titik Temu.
                    </p>

                    <div class="mt-10 space-y-4">
                        ${steps.map(([iconName, title, description]) => `
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
                        Pendaftaran terbuka
                    </p>
                </div>
            </section>

            <section class="flex min-h-screen flex-col bg-cream-100 px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
                <div class="flex items-center justify-between lg:hidden">
                    <div class="text-coffee-900">${brand}</div>
                    <span class="badge-neutral">Akun baru</span>
                </div>

                <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
                    <div class="mb-8">
                        <p class="section-eyebrow">Buat akun baru</p>
                        <h2 class="font-display text-3xl font-semibold tracking-tight text-coffee-900 sm:text-4xl">
                            Daftar sebagai kasir
                        </h2>
                        <p class="mt-3 text-sm leading-relaxed text-coffee-500">
                            Lengkapi data di bawah ini. Gunakan email aktif agar administrator mudah menghubungi Anda.
                        </p>
                    </div>

                    <div id="register-alert" class="mb-5 hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert"></div>

                    <form id="register-form" novalidate class="space-y-5">
                        <div>
                            <label for="reg-name" class="field-label">Nama lengkap</label>
                            <div class="relative">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-coffee-300">
                                    ${icon('user', 'size-4.5')}
                                </span>
                                <input id="reg-name" name="name" type="text" autocomplete="name" required
                                    class="input h-12 pl-11" placeholder="Nama sesuai identitas">
                            </div>
                        </div>

                        <div>
                            <label for="reg-email" class="field-label">Alamat email</label>
                            <div class="relative">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-coffee-300">
                                    ${icon('mail', 'size-4.5')}
                                </span>
                                <input id="reg-email" name="email" type="email" autocomplete="email" required
                                    class="input h-12 pl-11" placeholder="nama@titiktemu.id">
                            </div>
                        </div>

                        <div>
                            <label for="reg-password" class="field-label">Kata sandi</label>
                            <div class="relative">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-coffee-300">
                                    ${icon('lock', 'size-4.5')}
                                </span>
                                <input id="reg-password" name="password" type="password" autocomplete="new-password" required
                                    class="input h-12 pr-11 pl-11" placeholder="Buat kata sandi yang kuat">
                                <button type="button" id="toggle-reg-password" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-coffee-400 transition hover:text-coffee-700" aria-label="Tampilkan kata sandi">
                                    ${icon('eye', 'size-4.5')}
                                </button>
                            </div>
                            <p class="mt-2 text-[11px] leading-relaxed text-coffee-400">
                                Minimal 12 karakter, kombinasi huruf besar, huruf kecil, angka, dan simbol.
                            </p>
                        </div>

                        <div>
                            <label for="reg-password-confirmation" class="field-label">Konfirmasi kata sandi</label>
                            <div class="relative">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-coffee-300">
                                    ${icon('lock', 'size-4.5')}
                                </span>
                                <input id="reg-password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" required
                                    class="input h-12 pr-11 pl-11" placeholder="Ulangi kata sandi">
                                <button type="button" id="toggle-reg-password-confirmation" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-coffee-400 transition hover:text-coffee-700" aria-label="Tampilkan kata sandi">
                                    ${icon('eye', 'size-4.5')}
                                </button>
                            </div>
                        </div>

                        <button type="submit" id="register-submit" class="btn-primary h-12 w-full text-[15px]">
                            ${icon('arrowRight', 'size-4.5')}
                            Buat akun
                        </button>
                    </form>

                    <p class="mt-6 text-center text-sm text-coffee-500">
                        Sudah punya akun?
                        <button type="button" id="go-login" class="font-semibold text-clay-600 transition hover:text-clay-700">
                            Masuk di sini
                        </button>
                    </p>
                </div>

                <div class="mx-auto flex w-full max-w-md items-center justify-between border-t border-coffee-200/70 pt-5 text-[11px] text-coffee-400">
                    <p>Café Titik Temu · Sistem internal</p>
                    <p>v1.0</p>
                </div>
            </section>
        </div>
    `;

    const form = root.querySelector('#register-form');
    const submit = root.querySelector('#register-submit');
    const alert = root.querySelector('#register-alert');

    const bindToggle = (inputId, buttonId) => {
        const input = root.querySelector(`#${inputId}`);
        const button = root.querySelector(`#${buttonId}`);
        if (!input || !button) return;

        button.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.innerHTML = icon(isPassword ? 'eyeOff' : 'eye', 'size-4.5');
            button.setAttribute('aria-label', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
        });
    };

    bindToggle('reg-password', 'toggle-reg-password');
    bindToggle('reg-password-confirmation', 'toggle-reg-password-confirmation');

    root.querySelector('#go-login')?.addEventListener('click', () => onLogin?.());

    const showError = (message) => {
        alert.textContent = message;
        alert.classList.remove('hidden');
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const validate = ({ name, email, password, confirmation }) => {
        if (!name || !email || !password || !confirmation) {
            return 'Semua kolom wajib diisi.';
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return 'Format email tidak valid.';
        }

        if (password.length < 12) {
            return 'Kata sandi minimal 12 karakter.';
        }

        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            return 'Kata sandi harus mengandung huruf besar, huruf kecil, angka, dan simbol.';
        }

        if (password !== confirmation) {
            return 'Konfirmasi kata sandi tidak cocok.';
        }

        return null;
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        alert.classList.add('hidden');

        const name = root.querySelector('#reg-name').value.trim();
        const email = root.querySelector('#reg-email').value.trim();
        const password = root.querySelector('#reg-password').value;
        const confirmation = root.querySelector('#reg-password-confirmation').value;

        const error = validate({ name, email, password, confirmation });
        if (error) {
            showError(error);
            return;
        }

        setButtonLoading(submit, true, 'Membuat akun...');

        try {
            await authApi.register(name, email, password, confirmation);
            onSuccess?.(email);
        } catch (requestError) {
            const message = requestError instanceof ApiError
                ? (requestError.firstError || requestError.message)
                : 'Terjadi kesalahan. Silakan coba lagi.';
            showError(message);
            setButtonLoading(submit, false);
        }
    });
}
