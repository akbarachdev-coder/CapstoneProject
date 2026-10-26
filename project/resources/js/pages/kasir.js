import { api } from '../lib/api.js';
import { formError, pageHead, searchField } from '../lib/components.js';
import { escapeHtml, initials } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { bindPager, confirmModal, debounce, emptyState, errorState, formValues, openModal, pagerHtml, setButtonLoading, toast } from '../lib/ui.js';

const cashierCard = (cashier) => {
    const active = cashier.user?.is_active !== false;
    const hasAccount = Boolean(cashier.user);

    return `
        <article class="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <div class="p-4">
                <div class="flex items-start gap-3">
                    <span class="flex size-11 shrink-0 items-center justify-center rounded-full ${active ? 'bg-gradient-to-br from-coffee-700 to-clay-500 text-cream-50' : 'bg-coffee-200 text-coffee-500'} text-xs font-bold">
                        ${escapeHtml(initials(cashier.nama_kasir))}
                    </span>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <h3 class="truncate text-sm font-semibold text-coffee-900">${escapeHtml(cashier.nama_kasir)}</h3>
                                <p class="mt-0.5 truncate text-[11px] text-coffee-400">${escapeHtml(cashier.user?.email || 'Akun belum terhubung')}</p>
                            </div>
                            <span class="${active ? 'badge-paid' : 'badge-neutral'}">${active ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                        <div class="mt-2 flex items-center gap-1.5 text-[10px] text-coffee-300">
                            ${icon('cashier', 'size-3')}
                            ID Kasir #${cashier.id_kasir}
                            ${hasAccount ? '' : ' · Belum ada akun login'}
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between gap-2 border-t border-coffee-100 bg-cream-50/60 px-4 py-2.5">
                <label class="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-coffee-500">
                    <span class="relative inline-flex">
                        <input type="checkbox" class="peer sr-only" data-toggle="${cashier.id_kasir}" ${active ? 'checked' : ''} ${hasAccount ? '' : 'disabled'}>
                        <span class="h-5 w-9 rounded-full bg-coffee-200 transition peer-checked:bg-sage-500 peer-disabled:opacity-40"></span>
                        <span class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"></span>
                    </span>
                    ${active ? 'Aktif' : 'Nonaktif'}
                </label>
                <div class="flex items-center gap-0.5">
                    <button type="button" data-edit="${cashier.id_kasir}" class="icon-btn size-8" title="Ubah kasir" aria-label="Ubah ${escapeHtml(cashier.nama_kasir)}">${icon('edit', 'size-3.5')}</button>
                    <button type="button" data-delete="${cashier.id_kasir}" class="icon-btn-danger size-8" title="Hapus kasir" aria-label="Hapus ${escapeHtml(cashier.nama_kasir)}">${icon('trash', 'size-3.5')}</button>
                </div>
            </div>
        </article>
    `;
};

export async function renderKasir({ page, signal }) {
    const state = { search: '', page: 1, cashiers: [] };

    page.innerHTML = `
        ${pageHead({
            eyebrow: 'Pengaturan',
            title: 'Kelola Kasir',
            description: 'Buat akun kasir, atur akses, dan nonaktifkan akun yang tidak bertugas.',
            actions: `<button type="button" data-add class="btn-primary">${icon('plus', 'size-4')} Tambah kasir</button>`,
        })}

        <div class="card mb-4 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            ${searchField({ id: 'cashier-search', placeholder: 'Cari nama kasir...', value: '' })}
            <div class="flex items-center justify-between gap-3 sm:justify-end">
                <span id="cashier-count" class="text-xs text-coffee-400">Memuat kasir...</span>
                <button type="button" data-refresh class="icon-btn" title="Muat ulang" aria-label="Muat ulang kasir">${icon('refresh', 'size-4')}</button>
            </div>
        </div>

        <div id="cashier-content">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-40 rounded-2xl"></div>').join('')}
            </div>
        </div>
    `;

    const openCashierForm = (cashier = null) => {
        const editing = Boolean(cashier);
        const active = cashier?.user?.is_active !== false;

        openModal({
            title: editing ? 'Ubah kasir' : 'Tambah kasir',
            subtitle: editing
                ? `Perbarui data dan akses ${cashier.nama_kasir}.`
                : 'Akun ini akan dapat masuk dan mencatat transaksi.',
            body: `
                <form id="cashier-form" class="space-y-4" novalidate>
                    <div>
                        <label for="nama_kasir" class="field-label">Nama kasir</label>
                        <input id="nama_kasir" name="nama_kasir" type="text" maxlength="100" required value="${editing ? escapeHtml(cashier.nama_kasir) : ''}" class="input" placeholder="Nama lengkap kasir">
                    </div>
                    <div>
                        <label for="email" class="field-label">Email login</label>
                        <input id="email" name="email" type="email" maxlength="255" required value="${editing ? escapeHtml(cashier.user?.email || '') : ''}" class="input" placeholder="kasir@titiktemu.id">
                    </div>
                    <div>
                        <label for="password" class="field-label">${editing ? 'Kata sandi baru (opsional)' : 'Kata sandi'}</label>
                        <input id="password" name="password" type="password" maxlength="72" ${editing ? '' : 'required'} class="input" placeholder="${editing ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}">
                    </div>
                    <div>
                        <label for="password_confirmation" class="field-label">Ulangi kata sandi</label>
                        <input id="password_confirmation" name="password_confirmation" type="password" maxlength="72" ${editing ? '' : 'required'} class="input" placeholder="Ketik ulang kata sandi">
                    </div>
                    <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-coffee-200 bg-white px-3.5 py-3">
                        <span>
                            <span class="block text-xs font-semibold text-coffee-700">Akun aktif</span>
                            <span class="mt-0.5 block text-[10px] text-coffee-400">Kasir nonaktif tidak dapat masuk ke sistem.</span>
                        </span>
                        <span class="relative inline-flex">
                            <input type="checkbox" id="is_active" name="is_active" class="peer sr-only" ${active ? 'checked' : ''}>
                            <span class="h-5 w-9 rounded-full bg-coffee-200 transition peer-checked:bg-sage-500"></span>
                            <span class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"></span>
                        </span>
                    </label>
                    <div id="cashier-form-error"></div>
                </form>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Batal</button>
                <button type="submit" form="cashier-form" id="cashier-submit" class="btn-primary">${editing ? 'Simpan perubahan' : 'Tambah kasir'}</button>
            `,
            onOpen: (panel, close) => {
                const form = panel.querySelector('#cashier-form');
                const errorBox = panel.querySelector('#cashier-form-error');
                const submit = panel.querySelector('#cashier-submit');

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    errorBox.innerHTML = '';

                    const values = formValues(form);
                    const nama = values.nama_kasir.trim();
                    const email = values.email.trim();
                    const password = values.password;

                    if (!nama || !email) {
                        errorBox.innerHTML = formError('Nama dan email wajib diisi.');
                        return;
                    }

                    if (!editing && !password) {
                        errorBox.innerHTML = formError('Kata sandi wajib diisi untuk kasir baru.');
                        return;
                    }

                    if (password && password.length < 8) {
                        errorBox.innerHTML = formError('Kata sandi minimal 8 karakter.');
                        return;
                    }

                    if (password !== values.password_confirmation) {
                        errorBox.innerHTML = formError('Konfirmasi kata sandi tidak cocok.');
                        return;
                    }

                    const payload = {
                        nama_kasir: nama,
                        email,
                        is_active: form.querySelector('#is_active').checked,
                    };

                    if (password) {
                        payload.password = password;
                        payload.password_confirmation = values.password_confirmation;
                    }

                    setButtonLoading(submit, true, 'Menyimpan...');

                    try {
                        if (editing) {
                            await api.put(`kasir/${cashier.id_kasir}`, payload);
                            toast(`Akun ${nama} berhasil diperbarui.`, 'success');
                        } else {
                            await api.post('kasir', payload);
                            toast(`Akun kasir ${nama} berhasil dibuat.`, 'success');
                        }

                        close();
                        load(editing ? state.page : 1);
                    } catch (error) {
                        errorBox.innerHTML = formError(error?.firstError || error?.message || 'Kasir gagal disimpan.');
                        setButtonLoading(submit, false);
                    }
                });
            },
        });
    };

    const toggleCashier = async (cashier, active) => {
        if (!active) {
            const confirmed = await confirmModal({
                title: 'Nonaktifkan akun?',
                message: `${cashier.nama_kasir} tidak akan dapat masuk ke sistem sampai akun diaktifkan kembali.`,
                confirmText: 'Ya, nonaktifkan',
                tone: 'danger',
                iconName: 'shield',
            });

            if (!confirmed) {
                load(state.page);
                return;
            }
        }

        try {
            await api.put(`kasir/${cashier.id_kasir}`, { is_active: active });
            toast(`Akun ${cashier.nama_kasir} ${active ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
            load(state.page);
        } catch (error) {
            toast(error?.firstError || error?.message || 'Status akun gagal diperbarui.', 'error');
            load(state.page);
        }
    };

    const removeCashier = async (cashier) => {
        const confirmed = await confirmModal({
            title: 'Hapus kasir?',
            message: `Data kasir ${cashier.nama_kasir} dan akun login-nya akan dihapus permanen. Kasir yang memiliki transaksi tidak dapat dihapus.`,
            confirmText: 'Ya, hapus',
            tone: 'danger',
            iconName: 'trash',
        });

        if (!confirmed) return;

        try {
            await api.delete(`kasir/${cashier.id_kasir}`);
            toast(`Kasir ${cashier.nama_kasir} berhasil dihapus.`, 'success');
            load(state.page);
        } catch (error) {
            toast(error?.message || 'Kasir gagal dihapus.', 'error');
        }
    };

    const renderContent = (payload) => {
        const content = page.querySelector('#cashier-content');
        const count = page.querySelector('#cashier-count');
        const cashiers = payload.data || [];

        state.cashiers = cashiers;

        if (count) count.textContent = `${payload.meta?.total || 0} kasir`;

        if (!cashiers.length) {
            content.innerHTML = `
                <div class="card">
                    ${emptyState({
                        iconName: 'cashier',
                        title: state.search ? 'Kasir tidak ditemukan' : 'Belum ada kasir',
                        description: state.search
                            ? 'Coba kata kunci lain.'
                            : 'Tambahkan akun kasir agar transaksi dapat dicatat oleh tim.',
                        action: `<button type="button" data-add-empty class="btn-primary btn-sm">${icon('plus', 'size-3.5')} Tambah kasir</button>`,
                    })}
                </div>
            `;
            content.querySelector('[data-add-empty]')?.addEventListener('click', () => openCashierForm());
            return;
        }

        content.innerHTML = `
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                ${cashiers.map(cashierCard).join('')}
            </div>
            ${pagerHtml(payload.meta) ? `<div class="card mt-4 overflow-hidden">${pagerHtml(payload.meta)}</div>` : ''}
        `;

        content.querySelectorAll('[data-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const cashier = cashiers.find((item) => String(item.id_kasir) === button.dataset.edit);
                if (cashier) openCashierForm(cashier);
            });
        });

        content.querySelectorAll('[data-delete]').forEach((button) => {
            button.addEventListener('click', () => {
                const cashier = cashiers.find((item) => String(item.id_kasir) === button.dataset.delete);
                if (cashier) removeCashier(cashier);
            });
        });

        content.querySelectorAll('[data-toggle]').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                const cashier = cashiers.find((item) => String(item.id_kasir) === checkbox.dataset.toggle);
                if (cashier) toggleCashier(cashier, checkbox.checked);
            });
        });

        bindPager(content, (nextPage) => load(nextPage));
    };

    const load = async (pageNumber = 1) => {
        const content = page.querySelector('#cashier-content');
        if (!content) return;

        content.innerHTML = `
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-40 rounded-2xl"></div>').join('')}
            </div>
        `;

        try {
            const response = await api.get('kasir', {
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
        if (event.target.id === 'cashier-search') search(event.target.value);
    }, { signal });

    page.addEventListener('click', (event) => {
        if (event.target.closest('[data-add]')) {
            openCashierForm();
            return;
        }

        if (event.target.closest('[data-refresh]')) {
            load(state.page);
        }
    }, { signal });
}
