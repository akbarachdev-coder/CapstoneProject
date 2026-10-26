import { api, ApiError } from '../lib/api.js';
import { customerName, detailRow, formError, invoiceNumber, paidAmount, pageHead, panelHead, remainingAmount, searchField } from '../lib/components.js';
import { escapeHtml, formatDate, formatDateTime, formatTime, rupiah, today } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { bindPager, confirmModal, emptyState, errorState, methodIcon, methodLabel, openModal, pagerHtml, statusBadge, toast } from '../lib/ui.js';
import { openPaymentModal } from '../lib/payment.js';

const STATUS_TABS = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'dibayar', label: 'Lunas' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
];

const paymentTotal = (trx) => paidAmount(trx);

const rowActions = (trx, user) => {
    const remaining = remainingAmount(trx);
    const showPay = trx.status === 'pending' && remaining > 0.001;

    return `
        <div class="flex items-center justify-end gap-1">
            ${showPay ? `
                <button type="button" data-row-pay="${trx.id_transaksi}" class="btn-accent btn-sm" title="Catat pembayaran">
                    ${icon('wallet', 'size-3.5')}
                    Bayar
                </button>
            ` : ''}
            <button type="button" data-row-open="${trx.id_transaksi}" class="icon-btn" title="Lihat detail" aria-label="Lihat detail transaksi">
                ${icon('chevronRight', 'size-4')}
            </button>
        </div>
    `;
};

const desktopRows = (rows, user) => rows.map((trx) => {
    const remaining = remainingAmount(trx);
    return `
        <tr data-open="${trx.id_transaksi}" class="cursor-pointer">
            <td>
                <div class="flex items-center gap-2">
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cream-200/70 text-coffee-500">${icon('receipt', 'size-3.5')}</span>
                    <div>
                        <p class="font-semibold text-coffee-800">${invoiceNumber(trx.id_transaksi)}</p>
                        <p class="text-[10px] text-coffee-300">${formatTime(trx.tanggal)}</p>
                    </div>
                </div>
            </td>
            <td>
                <p class="max-w-44 truncate font-medium text-coffee-700">${escapeHtml(customerName(trx))}</p>
                <p class="text-[10px] text-coffee-300">${escapeHtml(trx.pelanggan?.no_hp || 'Tanpa nomor HP')}</p>
            </td>
            <td>
                <p class="text-xs font-medium text-coffee-600">${formatDate(trx.tanggal)}</p>
                <p class="text-[10px] text-coffee-300">${escapeHtml(trx.kasir?.nama_kasir || '—')}</p>
            </td>
            <td class="text-right">
                <p class="font-semibold text-coffee-800">${rupiah(trx.total)}</p>
                ${remaining > 0.001 && trx.status !== 'dibatalkan'
                    ? `<p class="text-[10px] font-medium text-amber-600">Sisa ${rupiah(remaining)}</p>`
                    : '<p class="text-[10px] text-coffee-300">Tidak ada sisa</p>'}
            </td>
            <td>${statusBadge(trx.status)}</td>
            <td>${rowActions(trx, user)}</td>
        </tr>
    `;
}).join('');

const mobileCards = (rows, user) => rows.map((trx) => {
    const remaining = remainingAmount(trx);
    return `
        <div data-open="${trx.id_transaksi}" class="cursor-pointer border-b border-coffee-100 p-4 last:border-0 active:bg-cream-50">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-coffee-800">${invoiceNumber(trx.id_transaksi)}</p>
                    <p class="mt-0.5 truncate text-xs text-coffee-500">${escapeHtml(customerName(trx))}</p>
                    <p class="mt-0.5 text-[10px] text-coffee-300">${formatDate(trx.tanggal)} · ${formatTime(trx.tanggal)} · ${escapeHtml(trx.kasir?.nama_kasir || '—')}</p>
                </div>
                <div class="flex flex-col items-end gap-1.5">
                    ${statusBadge(trx.status)}
                    <p class="text-sm font-bold text-coffee-900">${rupiah(trx.total)}</p>
                </div>
            </div>
            <div class="mt-3 flex items-center justify-between gap-2">
                <p class="text-[10px] ${remaining > 0.001 && trx.status !== 'dibatalkan' ? 'font-semibold text-amber-600' : 'text-coffee-300'}">
                    ${remaining > 0.001 && trx.status !== 'dibatalkan' ? `Sisa ${rupiah(remaining)}` : 'Pembayaran selesai'}
                </p>
                <div class="flex items-center gap-1">
                    ${trx.status === 'pending' && remaining > 0.001 ? `
                        <button type="button" data-row-pay="${trx.id_transaksi}" class="btn-accent btn-sm">${icon('wallet', 'size-3.5')} Bayar</button>
                    ` : ''}
                    <span class="text-coffee-300">${icon('chevronRight', 'size-4')}</span>
                </div>
            </div>
        </div>
    `;
}).join('');

export async function renderTransaksi({ user, page, query, signal, navigate }) {
    const state = {
        status: query.get('status') || '',
        dari: query.get('dari') || '',
        sampai: query.get('sampai') || '',
        search: '',
        page: 1,
        lastData: null,
        initialOpenHandled: false,
    };

    if (!STATUS_TABS.some((tab) => tab.value === state.status)) {
        state.status = '';
    }

    const filteredRows = (rows) => {
        const search = state.search.trim().toLowerCase();
        if (!search) return rows;

        return rows.filter((trx) => [
            invoiceNumber(trx.id_transaksi),
            customerName(trx),
            trx.kasir?.nama_kasir || '',
            String(trx.total),
        ].some((value) => value.toLowerCase().includes(search)));
    };

    const openDetail = async (trxId) => {
        let trx = (state.lastData?.data || []).find((item) => String(item.id_transaksi) === String(trxId));

        if (!trx) {
            try {
                const response = await api.get(`transaksi/${trxId}`);
                trx = response.data;
            } catch (error) {
                toast(error?.message || 'Detail transaksi tidak dapat dimuat.', 'error');
                return;
            }
        }

        showDetail(trx);
    };

    const showDetail = (trx) => {
        const paid = paymentTotal(trx);
        const remaining = remainingAmount(trx);
        const payments = trx.pembayaran || [];
        const canPay = trx.status === 'pending' && remaining > 0.001;
        const canEdit = trx.status === 'pending' && payments.length === 0;
        const canCancel = user.role === 'admin' && trx.status === 'pending' && paid <= 0.001;
        const canDelete = user.role === 'admin' && trx.status === 'pending' && payments.length === 0;

        const items = (trx.details || []).map((detail) => `
            <div class="flex items-start justify-between gap-3 py-2">
                <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-coffee-800">${escapeHtml(detail.menu?.nama_menu || `Menu #${detail.id_menu}`)}</p>
                    <p class="mt-0.5 text-[11px] text-coffee-400">${detail.jumlah} × ${rupiah(detail.harga_satuan)}</p>
                </div>
                <p class="shrink-0 text-sm font-semibold text-coffee-800">${rupiah(detail.subtotal)}</p>
            </div>
        `).join('');

        const paymentList = payments.length
            ? payments.map((payment) => `
                <div class="flex items-center justify-between gap-3 py-2.5">
                    <div class="flex items-center gap-2.5">
                        <span class="flex size-8 items-center justify-center rounded-lg bg-coffee-100 text-coffee-600">${methodIcon(payment.metode_pembayaran)}</span>
                        <div>
                            <p class="text-xs font-semibold text-coffee-700">${escapeHtml(methodLabel(payment.metode_pembayaran))}</p>
                            <p class="text-[10px] text-coffee-300">${formatDateTime(payment.tanggal_pembayaran)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-semibold text-coffee-800">${rupiah(payment.jumlah_bayar)}</p>
                        <p class="text-[10px] text-coffee-300">${escapeHtml(payment.status_pembayaran)}</p>
                    </div>
                </div>
            `).join('')
            : '<p class="py-3 text-center text-xs text-coffee-300">Belum ada pembayaran.</p>';

        const footer = `
            <button type="button" data-modal-close class="btn-secondary">Tutup</button>
            ${canDelete ? `<button type="button" data-delete class="btn-ghost text-rose-600 hover:bg-rose-50">${icon('trash', 'size-4')} Hapus</button>` : ''}
            ${canCancel ? `<button type="button" data-cancel class="btn-ghost text-rose-600 hover:bg-rose-50">Batalkan</button>` : ''}
            ${canEdit ? `<button type="button" data-edit class="btn-secondary">${icon('edit', 'size-4')} Ubah</button>` : ''}
            ${canPay ? `<button type="button" data-pay class="btn-primary">${icon('wallet', 'size-4')} Bayar ${rupiah(remaining)}</button>` : ''}
        `;

        const modal = openModal({
            title: 'Detail transaksi',
            subtitle: `${invoiceNumber(trx.id_transaksi)} · ${formatDateTime(trx.tanggal)}`,
            wide: true,
            body: `
                <div class="space-y-5">
                    <div class="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-cream-200/50 p-4">
                        <div>
                            <p class="text-[10px] font-semibold tracking-[0.14em] text-coffee-400 uppercase">Pelanggan</p>
                            <p class="mt-0.5 text-sm font-semibold text-coffee-900">${escapeHtml(customerName(trx))}</p>
                            <p class="mt-0.5 text-xs text-coffee-400">${escapeHtml(trx.pelanggan?.no_hp || 'Tanpa nomor HP')}</p>
                        </div>
                        <div class="text-left sm:text-right">
                            <p class="text-[10px] font-semibold tracking-[0.14em] text-coffee-400 uppercase">Status</p>
                            <div class="mt-1">${statusBadge(trx.status)}</div>
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-xl border border-coffee-200/70 bg-white/70 p-3.5">
                            <p class="text-[10px] font-semibold tracking-[0.12em] text-coffee-400 uppercase">Kasir</p>
                            <p class="mt-1 text-sm font-medium text-coffee-700">${escapeHtml(trx.kasir?.nama_kasir || '—')}</p>
                        </div>
                        <div class="rounded-xl border border-coffee-200/70 bg-white/70 p-3.5">
                            <p class="text-[10px] font-semibold tracking-[0.12em] text-coffee-400 uppercase">Dibuat</p>
                            <p class="mt-1 text-sm font-medium text-coffee-700">${formatDateTime(trx.created_at)}</p>
                        </div>
                    </div>

                    <div>
                        <div class="mb-2 flex items-center justify-between">
                            <h3 class="text-xs font-bold tracking-[0.12em] text-coffee-400 uppercase">Item pesanan</h3>
                            <span class="badge-neutral">${(trx.details || []).length} menu</span>
                        </div>
                        <div class="divide-y divide-coffee-100 rounded-xl border border-coffee-200/70 bg-white/70 px-3.5">
                            ${items || '<p class="py-4 text-center text-xs text-coffee-300">Tidak ada item.</p>'}
                        </div>
                    </div>

                    <div class="rounded-xl border border-coffee-200/70 bg-white/70 p-4">
                        ${detailRow('Subtotal', rupiah(trx.total))}
                        ${detailRow('Sudah dibayar', rupiah(paid), { muted: true })}
                        <div class="my-2 divider"></div>
                        ${detailRow('Sisa tagihan', rupiah(remaining), { strong: true })}
                    </div>

                    <div>
                        <div class="mb-2 flex items-center justify-between">
                            <h3 class="text-xs font-bold tracking-[0.12em] text-coffee-400 uppercase">Riwayat pembayaran</h3>
                            <span class="text-[10px] text-coffee-300">${payments.length} pembayaran</span>
                        </div>
                        <div class="divide-y divide-coffee-100 rounded-xl border border-coffee-200/70 bg-white/70 px-3.5">
                            ${paymentList}
                        </div>
                    </div>
                </div>
            `,
            footer,
            onOpen: (panel) => {
                panel.querySelector('[data-pay]')?.addEventListener('click', () => {
                    modal.close();
                    openPaymentModal(trx, {
                        onSuccess: () => load(state.page),
                    });
                });

                panel.querySelector('[data-edit]')?.addEventListener('click', () => {
                    modal.close();
                    navigate(`transaksi-baru?edit=${trx.id_transaksi}`);
                });

                panel.querySelector('[data-cancel]')?.addEventListener('click', async () => {
                    modal.close();
                    const confirmed = await confirmModal({
                        title: 'Batalkan transaksi?',
                        message: `Transaksi ${invoiceNumber(trx.id_transaksi)} akan ditandai dibatalkan dan tidak dihitung dalam laporan.`,
                        confirmText: 'Ya, batalkan',
                        tone: 'danger',
                    });
                    if (!confirmed) return;

                    try {
                        await api.patch(`transaksi/${trx.id_transaksi}/status`, { status: 'dibatalkan' });
                        toast('Transaksi berhasil dibatalkan.', 'success');
                        load(state.page);
                    } catch (error) {
                        toast(error?.firstError || error?.message || 'Transaksi gagal dibatalkan.', 'error');
                    }
                });

                panel.querySelector('[data-delete]')?.addEventListener('click', async () => {
                    modal.close();
                    const confirmed = await confirmModal({
                        title: 'Hapus transaksi?',
                        message: `Transaksi ${invoiceNumber(trx.id_transaksi)} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
                        confirmText: 'Ya, hapus',
                        tone: 'danger',
                        iconName: 'trash',
                    });
                    if (!confirmed) return;

                    try {
                        await api.delete(`transaksi/${trx.id_transaksi}`);
                        toast('Transaksi berhasil dihapus.', 'success');
                        load(1);
                    } catch (error) {
                        toast(error?.message || 'Transaksi gagal dihapus.', 'error');
                    }
                });
            },
        });
    };

    const renderContent = (payload) => {
        const content = page.querySelector('#trx-content');
        if (!content || !payload) return;

        const rows = filteredRows(payload.data || []);
        const count = page.querySelector('#trx-count');
        if (count) count.textContent = `${filteredRows(payload.data || []).length} dari ${payload.meta?.total || 0} transaksi`;

        if (!rows.length) {
            content.innerHTML = `
                <div class="card">
                    ${emptyState({
                        iconName: 'receipt',
                        title: state.search ? 'Transaksi tidak ditemukan' : 'Belum ada transaksi',
                        description: state.search
                            ? 'Coba kata kunci lain atau ubah filter status.'
                            : 'Transaksi yang tercatat akan muncul di sini.',
                        action: `<a href="#/transaksi-baru" class="btn-primary btn-sm">${icon('plus', 'size-3.5')} Transaksi baru</a>`,
                    })}
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="card overflow-hidden">
                <div class="hidden md:block table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Pelanggan</th>
                                <th>Tanggal / Kasir</th>
                                <th class="text-right">Total</th>
                                <th>Status</th>
                                <th class="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>${desktopRows(rows, user)}</tbody>
                    </table>
                </div>
                <div class="md:hidden">${mobileCards(rows, user)}</div>
                ${pagerHtml(payload.meta)}
            </div>
        `;

        content.querySelectorAll('[data-open]').forEach((element) => {
            element.addEventListener('click', (event) => {
                if (event.target.closest('[data-row-pay]')) return;
                openDetail(element.dataset.open);
            });
        });

        content.querySelectorAll('[data-row-open]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                openDetail(button.dataset.rowOpen);
            });
        });

        content.querySelectorAll('[data-row-pay]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const trx = (payload.data || []).find((item) => String(item.id_transaksi) === button.dataset.rowPay);
                if (!trx) return;
                openPaymentModal(trx, {
                    onSuccess: () => load(state.page),
                });
            });
        });

        bindPager(content, (nextPage) => load(nextPage));
    };

    const load = async (pageNumber = 1) => {
        page.innerHTML = `
            ${pageHead({
                eyebrow: 'Operasional',
                title: 'Transaksi',
                description: 'Pantau seluruh transaksi, pembayaran, dan status pesanan.',
                actions: `
                    <a href="#/transaksi-baru" class="btn-primary">${icon('plus', 'size-4')} Transaksi baru</a>
                `,
            })}
            <div class="skeleton h-20 w-full rounded-2xl"></div>
            <div class="mt-4 skeleton h-96 w-full rounded-2xl"></div>
        `;

        try {
            const response = await api.get('transaksi', {
                status: state.status,
                dari: state.dari,
                sampai: state.sampai,
                per_page: 15,
                page: pageNumber,
            });

            if (signal.aborted) return;

            state.lastData = response;
            state.page = Number(response.meta?.current_page || pageNumber);

            page.innerHTML = `
                ${pageHead({
                    eyebrow: 'Operasional',
                    title: 'Transaksi',
                    description: 'Pantau seluruh transaksi, pembayaran, dan status pesanan.',
                    actions: `
                        <a href="#/transaksi-baru" class="btn-primary">${icon('plus', 'size-4')} Transaksi baru</a>
                    `,
                })}

                <div class="card mb-4 p-3.5">
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div class="flex gap-1 overflow-x-auto rounded-xl bg-coffee-100/70 p-1 scrollbar-none" data-status-tabs>
                            ${STATUS_TABS.map((tab) => `
                                <button type="button" data-status="${tab.value}" class="tab ${state.status === tab.value ? 'tab-active' : ''}">${tab.label}</button>
                            `).join('')}
                        </div>

                        <div class="flex flex-wrap items-end gap-2">
                            <div>
                                <label for="filter-dari" class="mb-1 block text-[10px] font-semibold tracking-wide text-coffee-400">Dari</label>
                                <input id="filter-dari" type="date" value="${escapeHtml(state.dari)}" max="${today()}" class="input h-9 py-1.5 text-xs">
                            </div>
                            <span class="pb-2.5 text-[10px] text-coffee-300">s/d</span>
                            <div>
                                <label for="filter-sampai" class="mb-1 block text-[10px] font-semibold tracking-wide text-coffee-400">Sampai</label>
                                <input id="filter-sampai" type="date" value="${escapeHtml(state.sampai)}" max="${today()}" class="input h-9 py-1.5 text-xs">
                            </div>
                            <button type="button" data-reset class="btn-secondary btn-sm h-9">Reset</button>
                        </div>
                    </div>

                    <div class="mt-3 flex flex-col gap-2 border-t border-coffee-200/60 pt-3 sm:flex-row sm:items-center">
                        ${searchField({ id: 'trx-search', placeholder: 'Cari invoice, pelanggan, atau kasir di halaman ini...', value: state.search })}
                        <div class="flex items-center justify-between gap-3 sm:justify-end">
                            <span id="trx-count" class="text-xs text-coffee-400">—</span>
                            <button type="button" data-refresh class="icon-btn shrink-0" title="Muat ulang" aria-label="Muat ulang transaksi">${icon('refresh', 'size-4')}</button>
                        </div>
                    </div>
                </div>

                <div id="trx-content">
                    <div class="card overflow-hidden">
                        <div class="space-y-3 p-5">
                            ${Array.from({ length: 7 }).map(() => '<div class="skeleton h-12 w-full"></div>').join('')}
                        </div>
                    </div>
                </div>
            `;

            renderContent(response);

            if (!state.initialOpenHandled && query.get('id')) {
                state.initialOpenHandled = true;
                openDetail(query.get('id'));
            }
        } catch (error) {
            if (signal.aborted) return;
            page.innerHTML = `
                ${pageHead({ eyebrow: 'Operasional', title: 'Transaksi' })}
                <div class="card">${errorState(error?.message)}</div>
            `;
            page.querySelector('[data-retry]')?.addEventListener('click', () => load(pageNumber));
        }
    };

    await load(1);
    if (signal.aborted) return;

    page.addEventListener('click', (event) => {
        const statusButton = event.target.closest('[data-status]');
        if (statusButton) {
            state.status = statusButton.dataset.status;
            load(1);
            return;
        }

        if (event.target.closest('[data-reset]')) {
            state.status = '';
            state.dari = '';
            state.sampai = '';
            state.search = '';
            load(1);
            return;
        }

        if (event.target.closest('[data-refresh]')) {
            load(state.page);
        }
    }, { signal });

    page.addEventListener('input', (event) => {
        if (event.target.id === 'trx-search') {
            state.search = event.target.value;
            renderContent(state.lastData);
        }
    }, { signal });

    page.addEventListener('change', (event) => {
        if (event.target.id === 'filter-dari') {
            state.dari = event.target.value;
            if (state.sampai && state.dari > state.sampai) state.sampai = state.dari;
            load(1);
        }

        if (event.target.id === 'filter-sampai') {
            state.sampai = event.target.value;
            if (state.dari && state.sampai < state.dari) state.dari = state.sampai;
            load(1);
        }
    }, { signal });
}
