import { api, ApiError } from '../lib/api.js';
import { menuLook } from '../lib/catalog.js';
import { formError, invoiceNumber, pageHead, searchField } from '../lib/components.js';
import { escapeHtml, rupiah } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { debounce, emptyState, errorState, formValues, openModal, setButtonLoading, toast } from '../lib/ui.js';
import { openPaymentModal } from '../lib/payment.js';

const menuMarkup = (menu) => {
    const look = menuLook(menu.nama_menu);
    return `
        <button type="button" data-add-menu="${menu.id_menu}" class="menu-tile group text-left">
            <span class="relative flex h-24 items-center justify-center bg-gradient-to-br ${look.tone}">
                <span class="absolute inset-0 bg-grain opacity-30"></span>
                ${icon(look.icon, 'size-8 opacity-90')}
                <span class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:bg-white group-hover:text-coffee-900">
                    ${icon('plus', 'size-4')}
                </span>
            </span>
            <span class="flex flex-1 flex-col p-3">
                <span class="line-clamp-2 min-h-9 text-sm font-semibold leading-snug text-coffee-800">${escapeHtml(menu.nama_menu)}</span>
                <span class="mt-1.5 flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-clay-600">${rupiah(menu.harga)}</span>
                    <span class="text-[10px] text-coffee-300">Tambah</span>
                </span>
            </span>
        </button>
    `;
};

export async function renderPos({ user, page, query, signal, navigate }) {
    const editingId = query.get('edit');
    const state = {
        menus: [],
        customers: [],
        cashiers: [],
        cart: new Map(),
        customerId: '',
        cashierId: '',
        editing: null,
        lastSaved: null,
        search: '',
        submitting: false,
    };

    const cartItems = () => Array.from(state.cart.values());
    const cartCount = () => cartItems().reduce((total, item) => total + item.qty, 0);
    const cartTotal = () => cartItems().reduce((total, item) => total + (Number(item.menu.harga) * item.qty), 0);
    const selectedCustomer = () => state.customers.find((customer) => String(customer.id_pelanggan) === String(state.customerId)) || null;
    const selectedCashier = () => state.cashiers.find((cashier) => String(cashier.id_kasir) === String(state.cashierId)) || null;

    const hasCashierAccess = () => {
        if (user.role !== 'admin') return Boolean(user.id_kasir);
        return Boolean(state.cashierId);
    };

    const activeCashiers = () => state.cashiers.filter((cashier) => cashier.user?.is_active !== false);

    const filteredMenus = () => {
        const search = state.search.trim().toLowerCase();
        if (!search) return state.menus;
        return state.menus.filter((menu) => menu.nama_menu.toLowerCase().includes(search));
    };

    const renderMenuGrid = () => {
        const grid = page.querySelector('#menu-grid');
        const count = page.querySelector('#menu-count');
        if (!grid) return;

        const menus = filteredMenus();
        if (count) count.textContent = `${menus.length} menu`;

        if (!menus.length) {
            grid.innerHTML = `
                <div class="col-span-full">
                    ${emptyState({
                        iconName: 'cup',
                        title: state.menus.length ? 'Menu tidak ditemukan' : 'Menu belum tersedia',
                        description: state.menus.length
                            ? 'Coba gunakan kata kunci lain.'
                            : 'Administrator belum menambahkan menu ke sistem.',
                        action: state.menus.length
                            ? ''
                            : '<a href="#/menu" class="btn-secondary btn-sm">Kelola menu</a>',
                    })}
                </div>
            `;
            return;
        }

        grid.innerHTML = menus.map(menuMarkup).join('');
    };

    const cartItemMarkup = (item) => `
        <div class="cart-line">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream-200/80 text-coffee-500">
                ${icon(menuLook(item.menu.nama_menu).icon, 'size-4')}
            </span>
            <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-semibold text-coffee-800">${escapeHtml(item.menu.nama_menu)}</p>
                <p class="mt-0.5 text-[10px] text-coffee-400">${rupiah(item.menu.harga)} × ${item.qty}</p>
            </div>
            <div class="flex items-center gap-1.5">
                <button type="button" data-dec="${item.menu.id_menu}" class="qty-btn" aria-label="Kurangi jumlah">${icon('minus', 'size-3.5')}</button>
                <span class="w-5 text-center text-xs font-bold text-coffee-800">${item.qty}</span>
                <button type="button" data-inc="${item.menu.id_menu}" class="qty-btn" aria-label="Tambah jumlah">${icon('plus', 'size-3.5')}</button>
                <button type="button" data-remove="${item.menu.id_menu}" class="ml-1 text-coffee-300 transition hover:text-rose-500" aria-label="Hapus item">${icon('x', 'size-3.5')}</button>
            </div>
            <span class="w-16 shrink-0 text-right text-xs font-semibold text-coffee-800">${rupiah(item.menu.harga * item.qty)}</span>
        </div>
    `;

    const emptyCartMarkup = () => {
        if (state.lastSaved) {
            return `
                <div class="flex flex-col items-center gap-2 rounded-2xl bg-sage-50 px-4 py-6 text-center">
                    <span class="flex size-11 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                        ${icon('checkCircle', 'size-5')}
                    </span>
                    <p class="text-sm font-semibold text-coffee-800">Transaksi tersimpan</p>
                    <p class="text-[11px] text-coffee-400">${invoiceNumber(state.lastSaved.id_transaksi)} · ${rupiah(state.lastSaved.total)}</p>
                    <div class="mt-2 flex flex-wrap justify-center gap-2">
                        <button type="button" data-pay-last class="btn-primary btn-sm">${icon('wallet', 'size-3.5')} Bayar sekarang</button>
                        <button type="button" data-open-last class="btn-secondary btn-sm">Lihat detail</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-coffee-200 px-4 py-8 text-center">
                <span class="flex size-11 items-center justify-center rounded-full bg-cream-200/70 text-coffee-400">
                    ${icon('bag', 'size-5')}
                </span>
                <p class="text-sm font-semibold text-coffee-700">Keranjang masih kosong</p>
                <p class="text-[11px] leading-relaxed text-coffee-400">Klik menu di samping untuk mulai mencatat pesanan.</p>
            </div>
        `;
    };

    const cashierField = () => {
        if (state.editing) {
            return `
                <div>
                    <span class="field-label">Kasir</span>
                    <div class="flex items-center gap-2 rounded-xl border border-coffee-200 bg-cream-100/60 px-3 py-2.5 text-sm text-coffee-600">
                        ${icon('cashier', 'size-4 text-coffee-400')}
                        ${escapeHtml(state.editing.kasir?.nama_kasir || '—')}
                    </div>
                </div>
            `;
        }

        if (user.role === 'admin') {
            const cashiers = activeCashiers();
            if (!cashiers.length) {
                return `
                    <div class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-700">
                        Belum ada akun kasir aktif. <a href="#/kasir" class="font-bold underline underline-offset-2">Tambahkan kasir</a> sebelum mencatat transaksi.
                    </div>
                `;
            }

            return `
                <div>
                    <label for="cashier-select" class="field-label">Kasir bertugas</label>
                    <select id="cashier-select" class="select h-10 py-2">
                        ${cashiers.map((cashier) => `
                            <option value="${cashier.id_kasir}" ${String(cashier.id_kasir) === String(state.cashierId) ? 'selected' : ''}>
                                ${escapeHtml(cashier.nama_kasir)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }

        if (!user.id_kasir) {
            return `
                <div class="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] leading-relaxed text-rose-700">
                    Akun Anda belum terhubung ke data kasir. Hubungi administrator.
                </div>
            `;
        }

        return `
            <div>
                <span class="field-label">Kasir bertugas</span>
                <div class="flex items-center gap-2 rounded-xl border border-coffee-200 bg-cream-100/60 px-3 py-2.5 text-sm text-coffee-600">
                    ${icon('cashier', 'size-4 text-coffee-400')}
                    ${escapeHtml(user.kasir?.nama_kasir || user.name)}
                </div>
            </div>
        `;
    };

    const cartMarkup = () => {
        const items = cartItems();
        const total = cartTotal();
        const count = cartCount();
        const canOrder = items.length > 0 && hasCashierAccess() && !state.submitting;

        return `
            <div class="flex items-center justify-between border-b border-coffee-200/60 px-5 py-4">
                <div>
                    <h2 class="font-display text-lg font-semibold text-coffee-900">Pesanan</h2>
                    <p class="mt-0.5 text-xs text-coffee-400">${count > 0 ? `${count} item dipilih` : 'Belum ada item'}</p>
                </div>
                <span class="flex size-9 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                    ${icon('bag', 'size-4.5')}
                </span>
            </div>

            <div class="space-y-4 px-4 py-4">
                ${state.editing ? `
                    <div class="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-[11px] leading-relaxed text-sky-700">
                        ${icon('edit', 'size-4 shrink-0')}
                        <p>Mode ubah <span class="font-bold">${invoiceNumber(state.editing.id_transaksi)}</span>. Perubahan hanya dapat dilakukan sebelum ada pembayaran.</p>
                    </div>
                ` : ''}

                <div class="flex items-end gap-2">
                    <div class="min-w-0 flex-1">
                        <label for="customer-select" class="field-label">Pelanggan <span class="font-normal text-coffee-300">(opsional)</span></label>
                        <select id="customer-select" class="select h-10 py-2">
                            <option value="">Pelanggan umum</option>
                            ${state.customers.map((customer) => `
                                <option value="${customer.id_pelanggan}" ${String(customer.id_pelanggan) === String(state.customerId) ? 'selected' : ''}>
                                    ${escapeHtml(customer.nama_pelanggan)}${customer.no_hp ? ` · ${escapeHtml(customer.no_hp)}` : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <button type="button" data-new-customer class="btn-secondary h-10 px-3" title="Pelanggan baru" aria-label="Tambah pelanggan baru">
                        ${icon('plus', 'size-4')}
                    </button>
                </div>

                ${cashierField()}

                <div class="max-h-[340px] space-y-2 overflow-y-auto pr-0.5">
                    ${items.length ? items.map(cartItemMarkup).join('') : emptyCartMarkup()}
                </div>
            </div>

            <div class="space-y-3 border-t border-coffee-200/60 bg-cream-50/80 px-5 py-4">
                <div class="flex items-center justify-between text-xs text-coffee-400">
                    <span>Subtotal</span>
                    <span class="font-medium text-coffee-700">${rupiah(total)}</span>
                </div>
                <div class="flex items-end justify-between border-t border-dashed border-coffee-200 pt-3">
                    <span class="text-xs font-semibold text-coffee-500">Total pesanan</span>
                    <span class="font-display text-2xl font-semibold text-coffee-900">${rupiah(total)}</span>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" data-save="draft" class="btn-secondary ${canOrder ? '' : 'opacity-50'}" ${canOrder ? '' : 'disabled'}>
                        Simpan saja
                    </button>
                    <button type="button" data-save="pay" class="btn-primary ${canOrder ? '' : 'opacity-50'}" ${canOrder ? '' : 'disabled'}>
                        ${icon('wallet', 'size-4')}
                        Simpan &amp; bayar
                    </button>
                </div>
                <p class="text-center text-[10px] text-coffee-300">Pembayaran dapat dicatat sekaligus atau menyusul.</p>
            </div>
        `;
    };

    const renderCart = () => {
        const card = page.querySelector('#cart-card');
        if (!card) return;
        card.innerHTML = cartMarkup();
    };

    const refresh = () => {
        renderMenuGrid();
        renderCart();
    };

    const addMenu = (id) => {
        const menu = state.menus.find((item) => String(item.id_menu) === String(id));
        if (!menu) return;
        const existing = state.cart.get(String(id));
        state.cart.set(String(id), { menu, qty: Math.min(999, (existing?.qty || 0) + 1) });
        state.lastSaved = null;
        refresh();
    };

    const changeQty = (id, delta) => {
        const key = String(id);
        const existing = state.cart.get(key);
        if (!existing) return;
        const qty = existing.qty + delta;
        if (qty <= 0) state.cart.delete(key);
        else state.cart.set(key, { ...existing, qty: Math.min(999, qty) });
        refresh();
    };

    const openCustomerModal = () => {
        openModal({
            title: 'Pelanggan baru',
            subtitle: 'Tambahkan data pelanggan untuk pesanan ini.',
            body: `
                <form id="new-customer-form" class="space-y-4" novalidate>
                    <div>
                        <label for="nama_pelanggan" class="field-label">Nama pelanggan</label>
                        <input id="nama_pelanggan" name="nama_pelanggan" type="text" maxlength="100" required class="input" placeholder="Contoh: Sari Wulandari">
                    </div>
                    <div>
                        <label for="no_hp" class="field-label">Nomor HP</label>
                        <input id="no_hp" name="no_hp" type="tel" maxlength="15" required class="input" placeholder="08xxxxxxxxxx">
                        <p class="mt-1.5 text-[11px] text-coffee-400">Gunakan format Indonesia, mis. 081234567890.</p>
                    </div>
                    <div id="customer-error"></div>
                </form>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Batal</button>
                <button type="submit" form="new-customer-form" id="customer-submit" class="btn-primary">Simpan pelanggan</button>
            `,
            onOpen: (panel, close) => {
                const form = panel.querySelector('#new-customer-form');
                const errorBox = panel.querySelector('#customer-error');
                const submit = panel.querySelector('#customer-submit');

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    errorBox.innerHTML = '';
                    const values = formValues(form);

                    if (!values.nama_pelanggan.trim() || !values.no_hp.trim()) {
                        errorBox.innerHTML = formError('Nama dan nomor HP wajib diisi.');
                        return;
                    }

                    setButtonLoading(submit, true, 'Menyimpan...');

                    try {
                        const response = await api.post('pelanggan', {
                            nama_pelanggan: values.nama_pelanggan.trim(),
                            no_hp: values.no_hp.trim(),
                        });
                        const customer = response.data;
                        state.customers.push(customer);
                        state.customers.sort((a, b) => a.nama_pelanggan.localeCompare(b.nama_pelanggan));
                        state.customerId = String(customer.id_pelanggan);
                        close();
                        renderCart();
                        toast(`${customer.nama_pelanggan} ditambahkan ke daftar pelanggan.`, 'success');
                    } catch (error) {
                        errorBox.innerHTML = formError(error?.firstError || error?.message || 'Pelanggan gagal disimpan.');
                        setButtonLoading(submit, false);
                    }
                });
            },
        });
    };

    const saveOrder = async (mode, button) => {
        if (state.submitting) return;

        const items = cartItems().map((item) => ({
            id_menu: Number(item.menu.id_menu),
            jumlah: item.qty,
        }));

        if (!items.length) {
            toast('Tambahkan minimal satu menu ke pesanan.', 'warning');
            return;
        }

        if (!hasCashierAccess()) {
            toast(
                user.role === 'admin'
                    ? 'Pilih kasir yang bertugas terlebih dahulu.'
                    : 'Akun Anda belum terhubung ke data kasir.',
                'warning',
            );
            return;
        }

        const payload = { items };

        if (state.customerId) {
            payload.id_pelanggan = Number(state.customerId);
        } else if (state.editing) {
            payload.id_pelanggan = null;
        }

        if (user.role === 'admin' && !state.editing) {
            payload.id_kasir = Number(state.cashierId);
        }

        state.submitting = true;
        setButtonLoading(button, true, mode === 'pay' ? 'Menyimpan...' : 'Menyimpan...');

        try {
            let response;

            if (state.editing) {
                response = await api.put(`transaksi/${state.editing.id_transaksi}`, payload);
                toast('Perubahan transaksi berhasil disimpan.', 'success');
                state.submitting = false;
                setButtonLoading(button, false);

                if (mode === 'pay') {
                    openPaymentModal(response.data, {
                        onSuccess: () => navigate(`transaksi?id=${response.data.id_transaksi}`),
                    });
                } else {
                    navigate(`transaksi?id=${response.data.id_transaksi}`);
                }

                return;
            }

            response = await api.post('transaksi', payload);
            const created = response.data;
            state.lastSaved = created;
            state.cart.clear();
            state.customerId = '';
            state.submitting = false;
            refresh();
            toast(`${invoiceNumber(created.id_transaksi)} berhasil disimpan.`, 'success', 'Transaksi tercatat');

            if (mode === 'pay') {
                openPaymentModal(created, {
                    onSuccess: () => navigate(`transaksi?id=${created.id_transaksi}`),
                });
            }
        } catch (error) {
            state.submitting = false;
            const message = error instanceof ApiError
                ? (error.firstError || error.message)
                : 'Transaksi gagal disimpan.';
            toast(message, 'error');
            setButtonLoading(button, false);
        }
    };

    const load = async () => {
        page.innerHTML = `
            ${pageHead({
                eyebrow: 'Kasir',
                title: 'Transaksi baru',
                description: 'Pilih menu, atur jumlah, lalu simpan pesanan pelanggan.',
            })}
            <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                <div class="space-y-4">
                    <div class="skeleton h-14 w-full rounded-2xl"></div>
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        ${Array.from({ length: 6 }).map(() => `<div class="skeleton h-40 rounded-2xl"></div>`).join('')}
                    </div>
                </div>
                <div class="skeleton h-96 rounded-2xl"></div>
            </div>
        `;

        try {
            const requests = [
                api.get('menu', { per_page: 100 }),
                api.get('pelanggan', { per_page: 100 }),
                user.role === 'admin' ? api.get('kasir', { per_page: 100 }) : Promise.resolve({ data: [] }),
            ];

            if (editingId) requests.push(api.get(`transaksi/${editingId}`));

            const [menuResponse, customerResponse, cashierResponse, editResponse] = await Promise.all(requests);

            if (signal.aborted) return;

            state.menus = menuResponse.data || [];
            state.customers = customerResponse.data || [];
            state.cashiers = cashierResponse.data || [];

            if (editResponse?.data) {
                const trx = editResponse.data;
                if (trx.status !== 'pending' || (trx.pembayaran || []).length > 0) {
                    toast('Transaksi ini tidak dapat diubah karena sudah diproses.', 'warning');
                    navigate(`transaksi?id=${trx.id_transaksi}`);
                    return;
                }

                state.editing = trx;
                state.customerId = trx.id_pelanggan ? String(trx.id_pelanggan) : '';
                state.cashierId = trx.id_kasir ? String(trx.id_kasir) : '';

                (trx.details || []).forEach((detail) => {
                    const menu = detail.menu
                        || state.menus.find((item) => String(item.id_menu) === String(detail.id_menu))
                        || { id_menu: detail.id_menu, nama_menu: `Menu #${detail.id_menu}`, harga: detail.harga_satuan };
                    state.cart.set(String(menu.id_menu), { menu, qty: Number(detail.jumlah) });
                });
            }

            if (user.role === 'admin' && !state.cashierId) {
                const firstActive = activeCashiers()[0];
                if (firstActive) state.cashierId = String(firstActive.id_kasir);
                else if (user.id_kasir) state.cashierId = String(user.id_kasir);
            }

            const activeCustomers = state.customers.length;

            page.innerHTML = `
                ${pageHead({
                    eyebrow: state.editing ? 'Ubah transaksi' : 'Kasir',
                    title: state.editing ? `Ubah ${invoiceNumber(state.editing.id_transaksi)}` : 'Transaksi baru',
                    description: state.editing
                        ? 'Perbarui item pesanan sebelum pembayaran dicatat.'
                        : 'Pilih menu, atur jumlah, lalu simpan pesanan pelanggan.',
                    actions: state.editing
                        ? `<a href="#/transaksi?id=${state.editing.id_transaksi}" class="btn-secondary">${icon('arrowLeft', 'size-4')} Batal ubah</a>`
                        : `<a href="#/transaksi" class="btn-secondary">${icon('list', 'size-4')} Riwayat transaksi</a>`,
                })}

                <div id="pos-banner" class="mb-4"></div>

                <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                    <section class="min-w-0">
                        <div class="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                            ${searchField({ id: 'menu-search', placeholder: 'Cari menu...', value: state.search })}
                            <div class="flex items-center justify-between gap-2 sm:justify-end">
                                <span id="menu-count" class="text-xs text-coffee-400">${state.menus.length} menu</span>
                                <span class="hidden h-5 w-px bg-coffee-200 sm:block"></span>
                                <span class="text-[11px] text-coffee-400">${activeCustomers} pelanggan terdaftar</span>
                            </div>
                        </div>

                        <div id="menu-grid" class="grid grid-cols-2 gap-3 sm:grid-cols-3"></div>
                    </section>

                    <aside class="xl:sticky xl:top-24">
                        <div class="card overflow-hidden">
                            <div id="cart-card"></div>
                        </div>
                        <div class="mt-3 flex items-center justify-center gap-2 text-[10px] text-coffee-400">
                            ${icon('shield', 'size-3')}
                            Total dihitung otomatis oleh sistem
                        </div>
                    </aside>
                </div>
            `;

            refresh();

            if (state.editing) {
                page.querySelector('#pos-banner').innerHTML = `
                    <div class="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700">
                        ${icon('info', 'size-4')}
                        Anda sedang mengubah transaksi yang belum dibayar. Simpan untuk memperbarui total.
                    </div>
                `;
            }
        } catch (error) {
            if (signal.aborted) return;
            page.innerHTML = `
                ${pageHead({ eyebrow: 'Kasir', title: 'Transaksi baru' })}
                <div class="card">${errorState(error?.message)}</div>
            `;
            page.querySelector('[data-retry]')?.addEventListener('click', load);
        }
    };

    await load();
    if (signal.aborted) return;

    const searchHandler = debounce((value) => {
        state.search = value;
        renderMenuGrid();
    }, 180);

    page.addEventListener('click', (event) => {
        const add = event.target.closest('[data-add-menu]');
        if (add) {
            addMenu(add.dataset.addMenu);
            return;
        }

        const inc = event.target.closest('[data-inc]');
        if (inc) {
            changeQty(inc.dataset.inc, 1);
            return;
        }

        const dec = event.target.closest('[data-dec]');
        if (dec) {
            changeQty(dec.dataset.dec, -1);
            return;
        }

        const remove = event.target.closest('[data-remove]');
        if (remove) {
            state.cart.delete(String(remove.dataset.remove));
            renderCart();
            return;
        }

        if (event.target.closest('[data-new-customer]')) {
            openCustomerModal();
            return;
        }

        const save = event.target.closest('[data-save]');
        if (save) {
            saveOrder(save.dataset.save, save);
            return;
        }

        if (event.target.closest('[data-pay-last]') && state.lastSaved) {
            openPaymentModal(state.lastSaved, {
                onSuccess: () => navigate(`transaksi?id=${state.lastSaved.id_transaksi}`),
            });
            return;
        }

        if (event.target.closest('[data-open-last]') && state.lastSaved) {
            navigate(`transaksi?id=${state.lastSaved.id_transaksi}`);
        }
    }, { signal });

    page.addEventListener('input', (event) => {
        if (event.target.id === 'menu-search') {
            searchHandler(event.target.value);
        }
    }, { signal });

    page.addEventListener('change', (event) => {
        if (event.target.id === 'customer-select') {
            state.customerId = event.target.value;
        }

        if (event.target.id === 'cashier-select') {
            state.cashierId = event.target.value;
            renderCart();
        }
    }, { signal });
}
