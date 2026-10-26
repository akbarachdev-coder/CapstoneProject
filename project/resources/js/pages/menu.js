import { api } from '../lib/api.js';
import { menuLook } from '../lib/catalog.js';
import { formError, pageHead, searchField } from '../lib/components.js';
import { escapeHtml, formatDate, rupiah } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { bindPager, confirmModal, debounce, emptyState, errorState, formValues, openModal, pagerHtml, setButtonLoading, toast } from '../lib/ui.js';

const menuCard = (menu, isAdmin) => {
    const look = menuLook(menu.nama_menu);

    return `
        <article class="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <div class="relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br ${look.tone}">
                <span class="absolute inset-0 bg-grain opacity-30"></span>
                <span class="absolute -right-4 -bottom-6 size-24 rounded-full bg-white/10"></span>
                ${icon(look.icon, 'size-9 opacity-90')}
            </div>
            <div class="p-4">
                <div class="flex items-start justify-between gap-2">
                    <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-coffee-900">${escapeHtml(menu.nama_menu)}</h3>
                    ${isAdmin ? `
                        <div class="flex shrink-0 items-center gap-0.5">
                            <button type="button" data-edit="${menu.id_menu}" class="icon-btn size-8" title="Ubah menu" aria-label="Ubah ${escapeHtml(menu.nama_menu)}">${icon('edit', 'size-3.5')}</button>
                            <button type="button" data-delete="${menu.id_menu}" class="icon-btn-danger size-8" title="Hapus menu" aria-label="Hapus ${escapeHtml(menu.nama_menu)}">${icon('trash', 'size-3.5')}</button>
                        </div>
                    ` : ''}
                </div>
                <p class="mt-2 font-display text-lg font-semibold text-clay-700">${rupiah(menu.harga)}</p>
                <p class="mt-1 text-[10px] text-coffee-300">Diperbarui ${formatDate(menu.updated_at)}</p>
            </div>
        </article>
    `;
};

export async function renderMenu({ user, page, signal }) {
    const isAdmin = user.role === 'admin';
    const state = {
        search: '',
        page: 1,
        lastData: null,
    };

    page.innerHTML = `
        ${pageHead({
            eyebrow: 'Katalog',
            title: 'Menu',
            description: isAdmin
                ? 'Kelola daftar menu dan harga Café Titik Temu.'
                : 'Daftar menu dan harga yang tersedia di Café Titik Temu.',
            actions: isAdmin
                ? `<button type="button" data-add class="btn-primary">${icon('plus', 'size-4')} Tambah menu</button>`
                : '<span class="badge-neutral">Hanya baca</span>',
        })}

        <div class="card mb-4 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            ${searchField({ id: 'menu-search', placeholder: 'Cari nama menu...', value: '' })}
            <div class="flex items-center justify-between gap-3 sm:justify-end">
                <span id="menu-count" class="text-xs text-coffee-400">Memuat menu...</span>
                <button type="button" data-refresh class="icon-btn" title="Muat ulang" aria-label="Muat ulang menu">${icon('refresh', 'size-4')}</button>
            </div>
        </div>

        <div id="menu-content">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                ${Array.from({ length: 8 }).map(() => '<div class="skeleton h-48 rounded-2xl"></div>').join('')}
            </div>
        </div>
    `;

    const openMenuForm = (menu = null) => {
        const editing = Boolean(menu);

        openModal({
            title: editing ? 'Ubah menu' : 'Tambah menu',
            subtitle: editing ? `Perbarui informasi ${menu.nama_menu}.` : 'Masukkan nama dan harga menu baru.',
            body: `
                <form id="menu-form" class="space-y-4" novalidate>
                    <div>
                        <label for="nama_menu" class="field-label">Nama menu</label>
                        <input id="nama_menu" name="nama_menu" type="text" maxlength="100" required value="${editing ? escapeHtml(menu.nama_menu) : ''}" class="input" placeholder="Contoh: Es Kopi Susu Gula Aren">
                    </div>
                    <div>
                        <label for="harga" class="field-label">Harga</label>
                        <div class="relative">
                            <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-xs font-semibold text-coffee-400">Rp</span>
                            <input id="harga" name="harga" type="number" inputmode="decimal" min="0" step="0.01" required value="${editing ? escapeHtml(menu.harga) : ''}" class="input pl-11" placeholder="25000">
                        </div>
                        <p class="mt-1.5 text-[11px] text-coffee-400">Gunakan angka tanpa pemisah ribuan.</p>
                    </div>
                    <div id="menu-form-error"></div>
                </form>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Batal</button>
                <button type="submit" form="menu-form" id="menu-submit" class="btn-primary">${editing ? 'Simpan perubahan' : 'Tambah menu'}</button>
            `,
            onOpen: (panel, close) => {
                const form = panel.querySelector('#menu-form');
                const errorBox = panel.querySelector('#menu-form-error');
                const submit = panel.querySelector('#menu-submit');

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    errorBox.innerHTML = '';

                    const values = formValues(form);
                    const nama = values.nama_menu.trim();
                    const harga = Number(values.harga);

                    if (!nama) {
                        errorBox.innerHTML = formError('Nama menu wajib diisi.');
                        return;
                    }

                    if (!Number.isFinite(harga) || harga < 0) {
                        errorBox.innerHTML = formError('Harga menu tidak valid.');
                        return;
                    }

                    setButtonLoading(submit, true, 'Menyimpan...');

                    try {
                        if (editing) {
                            await api.put(`menu/${menu.id_menu}`, { nama_menu: nama, harga });
                            toast(`${nama} berhasil diperbarui.`, 'success');
                        } else {
                            await api.post('menu', { nama_menu: nama, harga });
                            toast(`${nama} berhasil ditambahkan ke menu.`, 'success');
                        }

                        close();
                        load(editing ? state.page : 1);
                    } catch (error) {
                        errorBox.innerHTML = formError(error?.firstError || error?.message || 'Menu gagal disimpan.');
                        setButtonLoading(submit, false);
                    }
                });
            },
        });
    };

    const removeMenu = async (menu) => {
        const confirmed = await confirmModal({
            title: 'Hapus menu?',
            message: `Menu "${menu.nama_menu}" akan dihapus dari katalog. Menu yang sudah dipakai transaksi tidak dapat dihapus.`,
            confirmText: 'Ya, hapus',
            tone: 'danger',
            iconName: 'trash',
        });

        if (!confirmed) return;

        try {
            await api.delete(`menu/${menu.id_menu}`);
            toast(`${menu.nama_menu} berhasil dihapus.`, 'success');
            load(state.page);
        } catch (error) {
            toast(error?.message || 'Menu gagal dihapus.', 'error');
        }
    };

    const renderContent = (payload) => {
        const content = page.querySelector('#menu-content');
        const count = page.querySelector('#menu-count');
        const menus = payload.data || [];

        if (count) count.textContent = `${payload.meta?.total || 0} menu`;

        if (!menus.length) {
            content.innerHTML = `
                <div class="card">
                    ${emptyState({
                        iconName: 'cup',
                        title: state.search ? 'Menu tidak ditemukan' : 'Belum ada menu',
                        description: state.search
                            ? 'Coba kata kunci lain.'
                            : 'Tambahkan menu pertama untuk mulai mencatat transaksi.',
                        action: isAdmin
                            ? `<button type="button" data-add-empty class="btn-primary btn-sm">${icon('plus', 'size-3.5')} Tambah menu</button>`
                            : '',
                    })}
                </div>
            `;
            content.querySelector('[data-add-empty]')?.addEventListener('click', () => openMenuForm());
            return;
        }

        content.innerHTML = `
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                ${menus.map((menu) => menuCard(menu, isAdmin)).join('')}
            </div>
            ${pagerHtml(payload.meta) ? `<div class="card mt-4 overflow-hidden">${pagerHtml(payload.meta)}</div>` : ''}
        `;

        content.querySelectorAll('[data-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const menu = menus.find((item) => String(item.id_menu) === button.dataset.edit);
                if (menu) openMenuForm(menu);
            });
        });

        content.querySelectorAll('[data-delete]').forEach((button) => {
            button.addEventListener('click', () => {
                const menu = menus.find((item) => String(item.id_menu) === button.dataset.delete);
                if (menu) removeMenu(menu);
            });
        });

        if (payload.meta) {
            bindPager(content, (nextPage) => load(nextPage));
        }
    };

    const load = async (pageNumber = 1) => {
        const content = page.querySelector('#menu-content');
        if (!content) return;

        content.innerHTML = `
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                ${Array.from({ length: 8 }).map(() => '<div class="skeleton h-48 rounded-2xl"></div>').join('')}
            </div>
        `;

        try {
            const response = await api.get('menu', {
                search: state.search,
                per_page: 12,
                page: pageNumber,
            });

            if (signal.aborted) return;
            state.page = Number(response.meta?.current_page || pageNumber);
            state.lastData = response;
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
        if (event.target.id === 'menu-search') search(event.target.value);
    }, { signal });

    page.addEventListener('click', (event) => {
        if (event.target.closest('[data-add]')) {
            openMenuForm();
            return;
        }

        if (event.target.closest('[data-refresh]')) {
            load(state.page);
        }
    }, { signal });
}
