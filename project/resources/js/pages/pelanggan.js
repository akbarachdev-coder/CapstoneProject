import { api } from '../lib/api.js';
import { formError, pageHead, searchField } from '../lib/components.js';
import { escapeHtml, formatDate, initials } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { bindPager, confirmModal, debounce, emptyState, errorState, formValues, openModal, pagerHtml, setButtonLoading, toast } from '../lib/ui.js';

const PHONE_PATTERN = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

const customerCard = (customer) => `
    <article class="card p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
        <div class="flex items-start gap-3">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coffee-700 to-clay-500 text-xs font-bold text-cream-50">
                ${escapeHtml(initials(customer.nama_pelanggan))}
            </span>
            <div class="min-w-0 flex-1">
                <h3 class="truncate text-sm font-semibold text-coffee-900">${escapeHtml(customer.nama_pelanggan)}</h3>
                <a href="tel:${escapeHtml(customer.no_hp)}" class="mt-0.5 inline-flex items-center gap-1.5 text-xs text-coffee-500 hover:text-clay-600">
                    ${icon('phone', 'size-3')}
                    ${escapeHtml(customer.no_hp)}
                </a>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
                <button type="button" data-edit="${customer.id_pelanggan}" class="icon-btn size-8" title="Ubah pelanggan" aria-label="Ubah ${escapeHtml(customer.nama_pelanggan)}">${icon('edit', 'size-3.5')}</button>
                <button type="button" data-delete="${customer.id_pelanggan}" class="icon-btn-danger size-8" title="Hapus pelanggan" aria-label="Hapus ${escapeHtml(customer.nama_pelanggan)}">${icon('trash', 'size-3.5')}</button>
            </div>
        </div>
        <div class="mt-3 flex items-center justify-between gap-2 border-t border-coffee-100 pt-3 text-[10px] text-coffee-300">
            <span class="flex items-center gap-1.5">${icon('calendar', 'size-3')} Terdaftar ${formatDate(customer.created_at)}</span>
            <span class="badge-neutral">#${customer.id_pelanggan}</span>
        </div>
    </article>
`;

export async function renderPelanggan({ page, signal }) {
    const state = { search: '', page: 1 };

    page.innerHTML = `
        ${pageHead({
            eyebrow: 'Relasi',
            title: 'Pelanggan',
            description: 'Simpan data pelanggan agar pesanan dan reservasi lebih mudah dikenali.',
            actions: `<button type="button" data-add class="btn-primary">${icon('plus', 'size-4')} Tambah pelanggan</button>`,
        })}

        <div class="card mb-4 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            ${searchField({ id: 'customer-search', placeholder: 'Cari nama atau nomor HP...', value: '' })}
            <div class="flex items-center justify-between gap-3 sm:justify-end">
                <span id="customer-count" class="text-xs text-coffee-400">Memuat pelanggan...</span>
                <button type="button" data-refresh class="icon-btn" title="Muat ulang" aria-label="Muat ulang pelanggan">${icon('refresh', 'size-4')}</button>
            </div>
        </div>

        <div id="customer-content">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-36 rounded-2xl"></div>').join('')}
            </div>
        </div>
    `;

    const openCustomerForm = (customer = null) => {
        const editing = Boolean(customer);

        openModal({
            title: editing ? 'Ubah pelanggan' : 'Tambah pelanggan',
            subtitle: editing ? `Perbarui data ${customer.nama_pelanggan}.` : 'Lengkapi data pelanggan baru.',
            body: `
                <form id="customer-form" class="space-y-4" novalidate>
                    <div>
                        <label for="nama_pelanggan" class="field-label">Nama pelanggan</label>
                        <input id="nama_pelanggan" name="nama_pelanggan" type="text" maxlength="100" required value="${editing ? escapeHtml(customer.nama_pelanggan) : ''}" class="input" placeholder="Nama lengkap pelanggan">
                    </div>
                    <div>
                        <label for="no_hp" class="field-label">Nomor HP</label>
                        <input id="no_hp" name="no_hp" type="tel" maxlength="15" required value="${editing ? escapeHtml(customer.no_hp) : ''}" class="input" placeholder="08xxxxxxxxxx">
                        <p class="mt-1.5 text-[11px] text-coffee-400">Format: 08xxxxxxxxxx, 628xxxxxxxxxx, atau +628xxxxxxxxxx.</p>
                    </div>
                    <div id="customer-form-error"></div>
                </form>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Batal</button>
                <button type="submit" form="customer-form" id="customer-submit" class="btn-primary">${editing ? 'Simpan perubahan' : 'Tambah pelanggan'}</button>
            `,
            onOpen: (panel, close) => {
                const form = panel.querySelector('#customer-form');
                const errorBox = panel.querySelector('#customer-form-error');
                const submit = panel.querySelector('#customer-submit');

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    errorBox.innerHTML = '';

                    const values = formValues(form);
                    const nama = values.nama_pelanggan.trim();
                    const phone = values.no_hp.trim();

                    if (!nama) {
                        errorBox.innerHTML = formError('Nama pelanggan wajib diisi.');
                        return;
                    }

                    if (!PHONE_PATTERN.test(phone)) {
                        errorBox.innerHTML = formError('Nomor HP tidak valid. Gunakan format Indonesia yang benar.');
                        return;
                    }

                    setButtonLoading(submit, true, 'Menyimpan...');

                    try {
                        const payload = { nama_pelanggan: nama, no_hp: phone };

                        if (editing) {
                            await api.put(`pelanggan/${customer.id_pelanggan}`, payload);
                            toast(`${nama} berhasil diperbarui.`, 'success');
                        } else {
                            await api.post('pelanggan', payload);
                            toast(`${nama} berhasil ditambahkan.`, 'success');
                        }

                        close();
                        load(editing ? state.page : 1);
                    } catch (error) {
                        errorBox.innerHTML = formError(error?.firstError || error?.message || 'Pelanggan gagal disimpan.');
                        setButtonLoading(submit, false);
                    }
                });
            },
        });
    };

    const removeCustomer = async (customer) => {
        const confirmed = await confirmModal({
            title: 'Hapus pelanggan?',
            message: `Data "${customer.nama_pelanggan}" akan dihapus. Pelanggan yang memiliki transaksi atau reservasi tidak dapat dihapus.`,
            confirmText: 'Ya, hapus',
            tone: 'danger',
            iconName: 'trash',
        });

        if (!confirmed) return;

        try {
            await api.delete(`pelanggan/${customer.id_pelanggan}`);
            toast(`${customer.nama_pelanggan} berhasil dihapus.`, 'success');
            load(state.page);
        } catch (error) {
            toast(error?.message || 'Pelanggan gagal dihapus.', 'error');
        }
    };

    const renderContent = (payload) => {
        const content = page.querySelector('#customer-content');
        const count = page.querySelector('#customer-count');
        const customers = payload.data || [];

        if (count) count.textContent = `${payload.meta?.total || 0} pelanggan`;

        if (!customers.length) {
            content.innerHTML = `
                <div class="card">
                    ${emptyState({
                        iconName: 'users',
                        title: state.search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan',
                        description: state.search
                            ? 'Coba kata kunci lain.'
                            : 'Tambahkan pelanggan agar transaksi dan reservasi lebih rapi.',
                        action: `<button type="button" data-add-empty class="btn-primary btn-sm">${icon('plus', 'size-3.5')} Tambah pelanggan</button>`,
                    })}
                </div>
            `;
            content.querySelector('[data-add-empty]')?.addEventListener('click', () => openCustomerForm());
            return;
        }

        content.innerHTML = `
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                ${customers.map(customerCard).join('')}
            </div>
            ${pagerHtml(payload.meta) ? `<div class="card mt-4 overflow-hidden">${pagerHtml(payload.meta)}</div>` : ''}
        `;

        content.querySelectorAll('[data-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const customer = customers.find((item) => String(item.id_pelanggan) === button.dataset.edit);
                if (customer) openCustomerForm(customer);
            });
        });

        content.querySelectorAll('[data-delete]').forEach((button) => {
            button.addEventListener('click', () => {
                const customer = customers.find((item) => String(item.id_pelanggan) === button.dataset.delete);
                if (customer) removeCustomer(customer);
            });
        });

        bindPager(content, (nextPage) => load(nextPage));
    };

    const load = async (pageNumber = 1) => {
        const content = page.querySelector('#customer-content');
        if (!content) return;

        content.innerHTML = `
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-36 rounded-2xl"></div>').join('')}
            </div>
        `;

        try {
            const response = await api.get('pelanggan', {
                search: state.search,
                per_page: 12,
                page: pageNumber,
            });

            if (signal.aborted) return;
            state.page = Number(response.meta?.current_page || pageNumber);
            renderContent(response);
        } catch (error) {
            if (signal.aborted) return;
            content.innerHTML = `<div class="card">${errorState(error?.message)}</div>`;
            content.querySelector('[data-retry]')?.addEventListener('click', () => load(pageNumber));
        }
    };

    await load(1);
    if (signal.aborted) return;

    const search = debounce((value) => {
        state.search = value;
        load(1);
    }, 300);

    page.addEventListener('input', (event) => {
        if (event.target.id === 'customer-search') search(event.target.value);
    }, { signal });

    page.addEventListener('click', (event) => {
        if (event.target.closest('[data-add]')) {
            openCustomerForm();
            return;
        }

        if (event.target.closest('[data-refresh]')) {
            load(state.page);
        }
    }, { signal });
}
