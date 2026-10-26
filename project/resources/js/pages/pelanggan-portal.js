import { ApiError, customerApi } from '../lib/api.js';
import { menuLook } from '../lib/catalog.js';
import { formError, invoiceNumber, paidAmount, remainingAmount } from '../lib/components.js';
import { escapeHtml, formatDateTime, rupiah } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { PAYMENT_METHODS } from '../lib/payment.js';
import { showReceiptModal } from '../lib/receipt.js';
import { emptyState, methodLabel, openModal, setButtonLoading, statusBadge, toast } from '../lib/ui.js';

const HISTORY_KEY = 'titiktemu.pesanan';
const MAX_HISTORY = 8;
const PHONE_PATTERN = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

const readHistory = () => {
    try {
        const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        return Array.isArray(value) ? value.filter((entry) => entry?.kode) : [];
    } catch {
        return [];
    }
};

const writeHistory = (entries) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
};

const rememberOrder = (transaksi) => {
    if (!transaksi?.kode_pesanan) return;
    const entry = { kode: transaksi.kode_pesanan, tanggal: transaksi.tanggal };
    writeHistory([entry, ...readHistory().filter((item) => item.kode !== entry.kode)]);
};

const brand = `
    <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coffee-900 text-cream-50 shadow-md">
        ${icon('cup', 'size-5')}
    </span>
    <span class="min-w-0">
        <span class="block font-display text-lg font-semibold leading-tight tracking-tight text-coffee-900">Titik Temu</span>
        <span class="block text-[9px] font-semibold tracking-[0.22em] text-coffee-400 uppercase">Pesan online</span>
    </span>
`;

const menuCard = (menu, quantity) => {
    const look = menuLook(menu.nama_menu);

    return `
        <article class="menu-tile">
            <div class="relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br ${look.tone}">
                <span class="absolute inset-0 bg-grain opacity-30"></span>
                <span class="absolute -right-5 -bottom-7 size-24 rounded-full bg-white/10"></span>
                ${icon(look.icon, 'size-8 opacity-90')}
                ${quantity ? `<span class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-coffee-900 text-[10px] font-bold text-cream-50">${quantity}</span>` : ''}
            </div>
            <div class="flex flex-1 flex-col p-3">
                <h3 class="line-clamp-2 min-h-9 text-sm font-semibold leading-snug text-coffee-900">${escapeHtml(menu.nama_menu)}</h3>
                <div class="mt-2 flex items-center justify-between gap-2">
                    <span class="font-display text-base font-semibold text-clay-700">${rupiah(menu.harga)}</span>
                    <button type="button" data-add-menu="${menu.id_menu}" class="flex size-8 items-center justify-center rounded-lg bg-coffee-900 text-cream-50 transition hover:bg-coffee-800" aria-label="Tambah ${escapeHtml(menu.nama_menu)}">
                        ${icon('plus', 'size-4')}
                    </button>
                </div>
            </div>
        </article>
    `;
};

export function renderCustomerPortal(root, { onExit } = {}) {
    const state = {
        menus: [],
        cart: new Map(),
        search: '',
        orders: [],
        loadingMenu: true,
        loadingHistory: true,
        submitting: false,
    };

    root.innerHTML = `
        <div class="min-h-screen">
            <header class="sticky top-0 z-30 border-b border-coffee-200/60 bg-cream-100/90 backdrop-blur-xl">
                <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <a href="#/pesan" class="flex items-center gap-3">${brand}</a>
                    <div class="flex items-center gap-2">
                        <span class="badge-neutral hidden sm:inline-flex">Mode tamu</span>
                        <button type="button" data-exit class="btn-secondary btn-sm">
                            ${icon('logout', 'size-3.5')}
                            Masuk staff
                        </button>
                        <button type="button" data-cart-jump class="btn-primary btn-sm">
                            ${icon('bag', 'size-3.5')}
                            Pesanan
                            <span data-cart-count class="rounded-full bg-white/15 px-1.5 text-[10px]">0</span>
                        </button>
                    </div>
                </div>
            </header>

            <section class="relative overflow-hidden bg-coffee-950 text-cream-50">
                <div class="pointer-events-none absolute inset-0 bg-grain opacity-50"></div>
                <div class="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-clay-500/25 blur-3xl"></div>
                <div class="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-sage-500/15 blur-3xl"></div>

                <div class="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                    <p class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-clay-200 uppercase">
                        ${icon('sparkles', 'size-3.5')}
                        Pesan langsung, tanpa antre
                    </p>
                    <h1 class="mt-4 max-w-2xl font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                        Pilih menu favorit, bayar dari meja Anda.
                    </h1>
                    <p class="mt-3 max-w-xl text-sm leading-relaxed text-coffee-200/80">
                        Lihat daftar menu, susun pesanan, lalu lakukan pembayaran. Tidak perlu membuat akun.
                    </p>
                    <div class="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-coffee-200">
                            ${icon('bag', 'size-3.5')} Pilih menu
                        </span>
                        <span class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-coffee-200">
                            ${icon('receipt', 'size-3.5')} Catat pesanan
                        </span>
                        <span class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-coffee-200">
                            ${icon('wallet', 'size-3.5')} Bayar &amp; terima struk
                        </span>
                    </div>
                </div>
            </section>

            <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <section>
                        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p class="section-eyebrow">Katalog</p>
                                <h2 class="font-display text-2xl font-semibold tracking-tight text-coffee-900">Daftar menu</h2>
                                <p id="customer-menu-count" class="mt-1 text-xs text-coffee-400">Memuat menu...</p>
                            </div>
                            <div class="relative w-full sm:max-w-xs">
                                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-coffee-300">
                                    ${icon('search', 'size-4')}
                                </span>
                                <input id="customer-menu-search" type="search" placeholder="Cari menu..." class="input h-10 pl-10" autocomplete="off">
                            </div>
                        </div>

                        <div id="customer-menu-grid" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-44 rounded-2xl"></div>').join('')}
                        </div>
                    </section>

                    <aside id="customer-order-panel" class="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        <div class="card overflow-hidden">
                            <div class="flex items-center justify-between border-b border-coffee-200/60 px-4 py-3.5">
                                <div>
                                    <h2 class="font-display text-lg font-semibold text-coffee-900">Pesanan Anda</h2>
                                    <p class="mt-0.5 text-[11px] text-coffee-400">Susun menu lalu buat pesanan</p>
                                </div>
                                <span id="customer-cart-badge" class="badge-neutral">0 item</span>
                            </div>
                            <div id="customer-cart-body"></div>
                        </div>

                        <div class="card overflow-hidden">
                            <div class="flex items-center justify-between border-b border-coffee-200/60 px-4 py-3.5">
                                <div>
                                    <h2 class="font-display text-lg font-semibold text-coffee-900">Pesanan saya</h2>
                                    <p class="mt-0.5 text-[11px] text-coffee-400">Tersimpan di perangkat ini</p>
                                </div>
                                <button type="button" data-refresh-history class="icon-btn" aria-label="Muat ulang pesanan">${icon('refresh', 'size-4')}</button>
                            </div>
                            <div id="customer-history" class="p-4">
                                <div class="space-y-2">
                                    <div class="skeleton h-16 rounded-xl"></div>
                                    <div class="skeleton h-16 rounded-xl"></div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <footer class="mx-auto flex max-w-6xl flex-col gap-2 border-t border-coffee-200/70 px-4 py-6 text-[11px] text-coffee-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p>© ${new Date().getFullYear()} Café Titik Temu · Pesanan pelanggan</p>
                <p class="flex items-center gap-1.5">${icon('shield', 'size-3')} Pembayaran tercatat aman</p>
            </footer>
        </div>
    `;

    const menuGrid = root.querySelector('#customer-menu-grid');
    const menuCount = root.querySelector('#customer-menu-count');
    const cartBody = root.querySelector('#customer-cart-body');
    const cartBadge = root.querySelector('#customer-cart-badge');
    const cartCount = root.querySelector('[data-cart-count]');
    const historyBox = root.querySelector('#customer-history');
    const orderPanel = root.querySelector('#customer-order-panel');

    const cartItems = () => Array.from(state.cart.values());
    const cartTotal = () => cartItems().reduce((total, item) => total + Number(item.menu.harga) * item.qty, 0);
    const itemCount = () => cartItems().reduce((total, item) => total + item.qty, 0);

    const renderMenu = () => {
        if (state.loadingMenu) return;

        const search = state.search.trim().toLowerCase();
        const menus = state.menus.filter((menu) => !search || menu.nama_menu.toLowerCase().includes(search));

        menuCount.textContent = `${menus.length} menu tersedia`;
        menuGrid.innerHTML = menus.length
            ? menus.map((menu) => menuCard(menu, state.cart.get(String(menu.id_menu))?.qty || 0)).join('')
            : emptyState({
                iconName: 'bag',
                title: 'Menu tidak ditemukan',
                description: 'Coba kata kunci lain atau lihat seluruh menu.',
            });
    };

    const renderCart = () => {
        const items = cartItems();
        const count = itemCount();

        if (cartBadge) cartBadge.textContent = `${count} item`;
        if (cartCount) cartCount.textContent = String(count);

        if (!items.length) {
            cartBody.innerHTML = `
                <div class="empty-state py-10">
                    <div class="flex size-12 items-center justify-center rounded-2xl bg-cream-200/70 text-coffee-400">
                        ${icon('bag', 'size-5')}
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-coffee-700">Keranjang masih kosong</p>
                        <p class="mt-1 text-xs text-coffee-400">Pilih menu di samping untuk mulai memesan.</p>
                    </div>
                </div>
            `;
            return;
        }

        cartBody.innerHTML = `
            <div class="space-y-2 p-4">
                ${items.map(({ menu, qty }) => `
                    <div class="cart-line">
                        <div class="min-w-0 flex-1">
                            <p class="truncate text-xs font-semibold text-coffee-800">${escapeHtml(menu.nama_menu)}</p>
                            <p class="mt-0.5 text-[10px] text-coffee-400">${rupiah(menu.harga)}</p>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" data-cart-minus="${menu.id_menu}" class="qty-btn" aria-label="Kurangi ${escapeHtml(menu.nama_menu)}">${icon('minus', 'size-3')}</button>
                            <span class="w-5 text-center text-xs font-semibold text-coffee-800">${qty}</span>
                            <button type="button" data-cart-plus="${menu.id_menu}" class="qty-btn" aria-label="Tambah ${escapeHtml(menu.nama_menu)}">${icon('plus', 'size-3')}</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="border-t border-coffee-200/60 p-4">
                <div class="space-y-3">
                    <div>
                        <label for="customer-name" class="field-label">Nama</label>
                        <input id="customer-name" type="text" maxlength="100" class="input h-10" placeholder="Nama Anda">
                    </div>
                    <div>
                        <label for="customer-phone" class="field-label">Nomor HP</label>
                        <input id="customer-phone" type="tel" maxlength="15" class="input h-10" placeholder="08xxxxxxxxxx">
                    </div>
                </div>
                <div class="my-4 flex items-center justify-between border-t border-dashed border-coffee-200 pt-3">
                    <span class="text-xs text-coffee-500">Total</span>
                    <span class="font-display text-xl font-semibold text-coffee-900">${rupiah(cartTotal())}</span>
                </div>
                <div id="customer-order-error"></div>
                <button type="button" data-checkout class="btn-primary mt-3 h-11 w-full">
                    ${icon('receipt', 'size-4')}
                    Buat pesanan
                </button>
                <p class="mt-2 text-center text-[10px] text-coffee-400">Total dihitung otomatis oleh sistem.</p>
            </div>
        `;
    };

    const renderHistory = () => {
        if (state.loadingHistory) return;

        if (!state.orders.length) {
            historyBox.innerHTML = `<p class="py-6 text-center text-xs text-coffee-400">Belum ada pesanan dari perangkat ini.</p>`;
            return;
        }

        historyBox.innerHTML = `
            <div class="space-y-2">
                ${state.orders.map((trx) => {
                    const remaining = remainingAmount(trx);
                    return `
                        <div class="rounded-xl border border-coffee-200/70 bg-white/70 p-3">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="text-xs font-semibold text-coffee-800">${invoiceNumber(trx.id_transaksi)}</p>
                                    <p class="mt-0.5 text-[10px] text-coffee-400">${formatDateTime(trx.tanggal)}</p>
                                </div>
                                ${statusBadge(trx.status)}
                            </div>
                            <div class="mt-2 flex items-center justify-between gap-2">
                                <div>
                                    <p class="text-xs font-semibold text-coffee-800">${rupiah(trx.total)}</p>
                                    ${remaining > 0.001 && trx.status === 'pending'
                                        ? `<p class="text-[10px] font-medium text-amber-600">Sisa ${rupiah(remaining)}</p>`
                                        : '<p class="text-[10px] text-coffee-300">Pembayaran selesai</p>'}
                                </div>
                                <div class="flex items-center gap-1">
                                    <button type="button" data-order-view="${escapeHtml(trx.kode_pesanan)}" class="btn-secondary btn-sm">Lihat</button>
                                    ${trx.status === 'pending' && remaining > 0.001
                                        ? `<button type="button" data-order-pay="${escapeHtml(trx.kode_pesanan)}" class="btn-accent btn-sm">Bayar</button>`
                                        : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    const orderByCode = (kode) => state.orders.find((order) => order.kode_pesanan === kode);

    const showOrderModal = (transaksi, { justCreated = false } = {}) => {
        const paid = paidAmount(transaksi);
        const remaining = remainingAmount(transaksi);
        const payments = (transaksi.pembayaran || []).filter((payment) => (
            ['sebagian', 'lunas'].includes(payment.status_pembayaran)
        ));
        const canPay = transaksi.status === 'pending' && remaining > 0.001;

        const modal = openModal({
            title: justCreated ? 'Pesanan berhasil dibuat' : 'Detail pesanan',
            subtitle: `${invoiceNumber(transaksi.id_transaksi)} · ${formatDateTime(transaksi.tanggal)}`,
            wide: true,
            body: `
                <div class="space-y-5">
                    ${justCreated ? `
                        <div class="flex items-start gap-3 rounded-2xl border border-sage-200 bg-sage-50 p-4 text-sage-700">
                            <span class="mt-0.5 shrink-0">${icon('checkCircle', 'size-5')}</span>
                            <div>
                                <p class="text-sm font-semibold">Pesanan tercatat oleh sistem.</p>
                                <p class="mt-0.5 text-xs leading-relaxed">Silakan lanjutkan pembayaran agar pesanan segera diproses.</p>
                            </div>
                        </div>
                    ` : ''}

                    <div class="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-cream-200/50 p-4">
                        <div>
                            <p class="text-[10px] font-semibold tracking-[0.14em] text-coffee-400 uppercase">Pelanggan</p>
                            <p class="mt-0.5 text-sm font-semibold text-coffee-900">${escapeHtml(transaksi.pelanggan?.nama_pelanggan || 'Pelanggan umum')}</p>
                            <p class="mt-0.5 text-xs text-coffee-400">${escapeHtml(transaksi.pelanggan?.no_hp || 'Tanpa nomor HP')}</p>
                        </div>
                        <div class="text-left sm:text-right">
                            <p class="text-[10px] font-semibold tracking-[0.14em] text-coffee-400 uppercase">Status</p>
                            <div class="mt-1">${statusBadge(transaksi.status)}</div>
                        </div>
                    </div>

                    <div>
                        <div class="mb-2 flex items-center justify-between">
                            <h3 class="text-xs font-bold tracking-[0.12em] text-coffee-400 uppercase">Item pesanan</h3>
                            <span class="badge-neutral">${(transaksi.details || []).length} menu</span>
                        </div>
                        <div class="divide-y divide-coffee-100 rounded-xl border border-coffee-200/70 bg-white/70 px-3.5">
                            ${(transaksi.details || []).map((detail) => `
                                <div class="flex items-start justify-between gap-3 py-2.5">
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-medium text-coffee-800">${escapeHtml(detail.menu?.nama_menu || `Menu #${detail.id_menu}`)}</p>
                                        <p class="mt-0.5 text-[11px] text-coffee-400">${detail.jumlah} x ${rupiah(detail.harga_satuan)}</p>
                                    </div>
                                    <p class="shrink-0 text-sm font-semibold text-coffee-800">${rupiah(detail.subtotal)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="rounded-xl border border-coffee-200/70 bg-white/70 p-4 text-sm">
                        <div class="flex items-center justify-between py-1"><span class="text-coffee-400">Total</span><span class="font-semibold text-coffee-800">${rupiah(transaksi.total)}</span></div>
                        <div class="flex items-center justify-between py-1"><span class="text-coffee-400">Dibayar</span><span class="text-coffee-600">${rupiah(paid)}</span></div>
                        <div class="mt-1 flex items-center justify-between border-t border-coffee-200/70 pt-2"><span class="font-semibold text-coffee-700">Sisa</span><span class="font-display text-base font-semibold ${remaining > 0.001 ? 'text-amber-600' : 'text-sage-700'}">${rupiah(remaining)}</span></div>
                    </div>

                    ${payments.length ? `
                        <div>
                            <h3 class="mb-2 text-xs font-bold tracking-[0.12em] text-coffee-400 uppercase">Pembayaran</h3>
                            <div class="divide-y divide-coffee-100 rounded-xl border border-coffee-200/70 bg-white/70 px-3.5">
                                ${payments.map((payment) => `
                                    <div class="flex items-center justify-between gap-3 py-2.5">
                                        <div>
                                            <p class="text-xs font-semibold text-coffee-700">${escapeHtml(methodLabel(payment.metode_pembayaran))}</p>
                                            <p class="text-[10px] text-coffee-300">${formatDateTime(payment.tanggal_pembayaran)}</p>
                                        </div>
                                        <p class="text-xs font-semibold text-coffee-800">${rupiah(payment.jumlah_bayar)}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Tutup</button>
                ${payments.length ? `<button type="button" data-order-receipt class="btn-secondary">${icon('printer', 'size-4')} Cetak struk</button>` : ''}
                ${canPay ? `<button type="button" data-order-pay-now class="btn-primary">${icon('wallet', 'size-4')} Bayar ${rupiah(remaining)}</button>` : ''}
            `,
            onOpen: (panel) => {
                panel.querySelector('[data-order-pay-now]')?.addEventListener('click', () => {
                    modal.close();
                    openCustomerPayment(transaksi);
                });
                panel.querySelector('[data-order-receipt]')?.addEventListener('click', () => {
                    showReceiptModal(transaksi);
                });
            },
        });
    };

    const openCustomerPayment = (transaksi) => {
        const remaining = remainingAmount(transaksi);

        if (remaining <= 0.001) {
            toast('Pesanan ini sudah lunas.', 'info');
            return;
        }

        const methodCards = PAYMENT_METHODS.map((method, index) => `
            <label class="cursor-pointer">
                <input type="radio" name="metode_pembayaran" value="${method.value}" class="peer sr-only" ${index === 0 ? 'checked' : ''}>
                <span class="flex flex-col items-center gap-1.5 rounded-xl border border-coffee-200 bg-white px-2 py-3 text-[11px] font-semibold text-coffee-500 transition hover:border-clay-300 peer-checked:border-clay-500 peer-checked:bg-clay-50 peer-checked:text-clay-700">
                    ${icon(method.icon, 'size-4.5')}
                    ${method.label}
                </span>
            </label>
        `).join('');

        openModal({
            title: 'Bayar pesanan',
            subtitle: `${invoiceNumber(transaksi.id_transaksi)} · Sisa ${rupiah(remaining)}`,
            body: `
                <form id="customer-payment-form" class="space-y-5" novalidate>
                    <div class="rounded-2xl bg-coffee-900 p-4 text-cream-50">
                        <p class="text-[10px] font-semibold tracking-[0.16em] text-coffee-300 uppercase">Total tagihan</p>
                        <p class="mt-1 font-display text-2xl font-semibold">${rupiah(remaining)}</p>
                    </div>

                    <div>
                        <span class="field-label">Metode pembayaran</span>
                        <div class="grid grid-cols-3 gap-2">${methodCards}</div>
                    </div>

                    <div>
                        <label for="customer-amount" class="field-label">Jumlah dibayar</label>
                        <div class="relative">
                            <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-xs font-semibold text-coffee-400">Rp</span>
                            <input id="customer-amount" name="jumlah_bayar" type="number" min="1" step="1" value="${remaining}" class="input h-12 pl-11 font-display text-lg font-semibold">
                        </div>
                    </div>

                    <div id="customer-payment-error"></div>
                </form>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Batal</button>
                <button type="submit" form="customer-payment-form" id="customer-payment-submit" class="btn-primary">
                    ${icon('checkCircle', 'size-4')}
                    Bayar sekarang
                </button>
            `,
            onOpen: (panel) => {
                const form = panel.querySelector('#customer-payment-form');
                const amount = panel.querySelector('#customer-amount');
                const errorBox = panel.querySelector('#customer-payment-error');
                const submit = panel.querySelector('#customer-payment-submit');

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    errorBox.innerHTML = '';

                    const value = Number(amount.value);
                    const method = new FormData(form).get('metode_pembayaran');

                    if (!value || value <= 0) {
                        errorBox.innerHTML = formError('Jumlah pembayaran harus lebih dari nol.');
                        return;
                    }

                    if (value > remaining + 0.001) {
                        errorBox.innerHTML = formError(`Jumlah melebihi sisa tagihan ${rupiah(remaining)}.`);
                        return;
                    }

                    setButtonLoading(submit, true, 'Memproses...');

                    try {
                        const result = await customerApi.pay(transaksi.kode_pesanan, {
                            metode_pembayaran: method,
                            jumlah_bayar: value,
                        });

                        const updated = result.transaksi;
                        toast('Pembayaran berhasil dicatat.', 'success', 'Terima kasih');
                        await loadHistory();
                        showReceiptModal(updated, { autoPrint: true });
                    } catch (error) {
                        const message = error instanceof ApiError
                            ? (error.firstError || error.message)
                            : 'Pembayaran gagal disimpan.';
                        errorBox.innerHTML = formError(message);
                        setButtonLoading(submit, false);
                    }
                });
            },
        });
    };

    const addToCart = (menuId) => {
        const menu = state.menus.find((item) => String(item.id_menu) === String(menuId));
        if (!menu) return;

        const key = String(menu.id_menu);
        const existing = state.cart.get(key);
        state.cart.set(key, { menu, qty: (existing?.qty || 0) + 1 });
        renderMenu();
        renderCart();
    };

    const changeQty = (menuId, delta) => {
        const key = String(menuId);
        const existing = state.cart.get(key);
        if (!existing) return;

        const qty = existing.qty + delta;
        if (qty <= 0) {
            state.cart.delete(key);
        } else {
            state.cart.set(key, { ...existing, qty });
        }

        renderMenu();
        renderCart();
    };

    const submitOrder = async () => {
        if (state.submitting) return;

        const errorBox = root.querySelector('#customer-order-error');
        const name = root.querySelector('#customer-name')?.value.trim() || '';
        const phone = root.querySelector('#customer-phone')?.value.trim() || '';

        if (errorBox) errorBox.innerHTML = '';

        if (!name) {
            if (errorBox) errorBox.innerHTML = formError('Nama wajib diisi.');
            root.querySelector('#customer-name')?.focus();
            return;
        }

        if (!PHONE_PATTERN.test(phone)) {
            if (errorBox) errorBox.innerHTML = formError('Nomor HP tidak valid. Gunakan format 08xxxxxxxxxx.');
            root.querySelector('#customer-phone')?.focus();
            return;
        }

        if (!state.cart.size) return;

        state.submitting = true;
        const button = root.querySelector('[data-checkout]');
        setButtonLoading(button, true, 'Membuat pesanan...');

        try {
            const transaksi = await customerApi.createOrder({
                nama_pelanggan: name,
                no_hp: phone,
                items: cartItems().map(({ menu, qty }) => ({ id_menu: menu.id_menu, jumlah: qty })),
            });

            state.cart.clear();
            renderMenu();
            renderCart();
            rememberOrder(transaksi);
            await loadHistory();
            toast('Pesanan berhasil dibuat dan dicatat sistem.', 'success', 'Pesanan diterima');
            showOrderModal(transaksi, { justCreated: true });
        } catch (error) {
            const message = error instanceof ApiError
                ? (error.firstError || error.message)
                : 'Pesanan gagal dibuat. Silakan coba lagi.';
            if (errorBox) errorBox.innerHTML = formError(message);
            setButtonLoading(button, false);
        } finally {
            state.submitting = false;
        }
    };

    const loadHistory = async () => {
        const entries = readHistory();

        if (!entries.length) {
            state.orders = [];
            state.loadingHistory = false;
            renderHistory();
            return;
        }

        const results = await Promise.all(entries.map(async (entry) => {
            try {
                return await customerApi.order(entry.kode);
            } catch {
                return null;
            }
        }));

        state.orders = results
            .filter(Boolean)
            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        state.loadingHistory = false;
        renderHistory();
    };

    const loadMenu = async () => {
        try {
            const response = await customerApi.menu();
            state.menus = response.data || [];
            state.loadingMenu = false;
            renderMenu();
        } catch (error) {
            state.loadingMenu = false;
            menuCount.textContent = 'Menu gagal dimuat';
            menuGrid.innerHTML = `<div class="card sm:col-span-2 xl:col-span-3">${emptyState({
                iconName: 'alert',
                title: 'Menu tidak dapat dimuat',
                description: error?.message || 'Periksa koneksi lalu coba lagi.',
                action: '<button type="button" data-retry-menu class="btn-secondary btn-sm">Coba lagi</button>',
            })}</div>`;
        }
    };

    root.addEventListener('click', async (event) => {
        const add = event.target.closest('[data-add-menu]');
        if (add) {
            addToCart(add.dataset.addMenu);
            return;
        }

        const plus = event.target.closest('[data-cart-plus]');
        if (plus) {
            changeQty(plus.dataset.cartPlus, 1);
            return;
        }

        const minus = event.target.closest('[data-cart-minus]');
        if (minus) {
            changeQty(minus.dataset.cartMinus, -1);
            return;
        }

        if (event.target.closest('[data-checkout]')) {
            await submitOrder();
            return;
        }

        if (event.target.closest('[data-cart-jump]')) {
            orderPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        if (event.target.closest('[data-refresh-history]')) {
            state.loadingHistory = true;
            renderHistory();
            await loadHistory();
            return;
        }

        const view = event.target.closest('[data-order-view]');
        if (view) {
            const trx = orderByCode(view.dataset.orderView);
            if (trx) showOrderModal(trx);
            return;
        }

        const pay = event.target.closest('[data-order-pay]');
        if (pay) {
            const trx = orderByCode(pay.dataset.orderPay);
            if (trx) openCustomerPayment(trx);
            return;
        }

        if (event.target.closest('[data-retry-menu]')) {
            state.loadingMenu = true;
            renderMenu();
            await loadMenu();
            return;
        }

        if (event.target.closest('[data-exit]')) {
            onExit?.();
        }
    });

    root.addEventListener('input', (event) => {
        if (event.target.id === 'customer-menu-search') {
            state.search = event.target.value;
            renderMenu();
        }
    });

    renderCart();
    renderHistory();
    loadMenu();
    loadHistory();
}
