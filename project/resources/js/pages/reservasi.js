import { api } from '../lib/api.js';
import { formError, pageHead } from '../lib/components.js';
import { escapeHtml, formatDate, formatTime, today } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { bindPager, confirmModal, emptyState, errorState, formValues, openModal, pagerHtml, setButtonLoading, statusBadge, toast } from '../lib/ui.js';

const STATUS_TABS = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'dikonfirmasi', label: 'Dikonfirmasi' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
];

const dateParts = (value) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return { day: '—', month: '—', weekday: '' };

    return {
        day: new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(date),
        month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
        weekday: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date),
    };
};

const reservationCard = (reservation, user) => {
    const parts = dateParts(reservation.tgl_reservasi);
    const isToday = reservation.tgl_reservasi === today();
    const canDelete = user.role === 'admin' && ['pending', 'dibatalkan'].includes(reservation.status_reservasi);
    const canEdit = !['selesai', 'dibatalkan'].includes(reservation.status_reservasi);

    return `
        <article class="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift ${isToday ? 'ring-1 ring-clay-300' : ''}">
            <div class="flex items-start gap-4 p-4">
                <div class="flex w-14 shrink-0 flex-col items-center rounded-xl ${isToday ? 'bg-clay-500 text-white' : 'bg-cream-200/80 text-coffee-700'} py-2">
                    <span class="font-display text-xl font-semibold leading-none">${parts.day}</span>
                    <span class="mt-1 text-[9px] font-bold tracking-wide uppercase ${isToday ? 'text-white/80' : 'text-coffee-400'}">${parts.month}</span>
                    <span class="mt-0.5 text-[8px] uppercase ${isToday ? 'text-white/60' : 'text-coffee-300'}">${parts.weekday}</span>
                </div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <h3 class="truncate text-sm font-semibold text-coffee-900">${escapeHtml(reservation.pelanggan?.nama_pelanggan || 'Pelanggan')}</h3>
                            <p class="mt-0.5 text-[10px] text-coffee-400">${escapeHtml(reservation.pelanggan?.no_hp || 'Tanpa nomor HP')}</p>
                        </div>
                        ${statusBadge(reservation.status_reservasi)}
                    </div>

                    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-coffee-500">
                        <span class="flex items-center gap-1.5">${icon('clock', 'size-3.5 text-coffee-300')} ${escapeHtml(formatTime(reservation.waktu_reservasi))}</span>
                        <span class="flex items-center gap-1.5">${icon('users', 'size-3.5 text-coffee-300')} ${reservation.jml_orang} orang</span>
                        ${isToday ? '<span class="badge-info">Hari ini</span>' : ''}
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between gap-2 border-t border-coffee-100 bg-cream-50/60 px-4 py-2.5">
                <div class="flex items-center gap-1">
                    ${reservation.status_reservasi === 'pending' ? `
                        <button type="button" data-confirm="${reservation.id_reservasi}" class="btn-secondary btn-sm text-sage-700">${icon('check', 'size-3.5')} Konfirmasi</button>
                    ` : ''}
                    ${reservation.status_reservasi === 'dikonfirmasi' ? `
                        <button type="button" data-complete="${reservation.id_reservasi}" class="btn-secondary btn-sm">${icon('checkCircle', 'size-3.5')} Selesai</button>
                    ` : ''}
                </div>
                <div class="flex items-center gap-0.5">
                    ${canEdit ? `<button type="button" data-edit="${reservation.id_reservasi}" class="icon-btn size-8" title="Ubah reservasi" aria-label="Ubah reservasi">${icon('edit', 'size-3.5')}</button>` : ''}
                    ${canDelete ? `<button type="button" data-delete="${reservation.id_reservasi}" class="icon-btn-danger size-8" title="Hapus reservasi" aria-label="Hapus reservasi">${icon('trash', 'size-3.5')}</button>` : ''}
                </div>
            </div>
        </article>
    `;
};

export async function renderReservasi({ user, page, signal, navigate }) {
    const state = {
        status: '',
        tanggal: '',
        page: 1,
        customers: [],
        lastData: null,
    };

    page.innerHTML = `
        ${pageHead({
            eyebrow: 'Operasional',
            title: 'Reservasi',
            description: 'Atur jadwal kunjungan pelanggan dan pantau ketersediaan meja.',
            actions: `<button type="button" data-add class="btn-primary">${icon('plus', 'size-4')} Reservasi baru</button>`,
        })}

        <div class="card mb-4 p-3.5">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex gap-1 overflow-x-auto rounded-xl bg-coffee-100/70 p-1 scrollbar-none" data-status-tabs>
                    ${STATUS_TABS.map((tab) => `
                        <button type="button" data-status="${tab.value}" class="tab ${state.status === tab.value ? 'tab-active' : ''}">${tab.label}</button>
                    `).join('')}
                </div>

                <div class="flex items-end gap-2">
                    <div>
                        <label for="reservation-date" class="mb-1 block text-[10px] font-semibold tracking-wide text-coffee-400">Tanggal</label>
                        <input id="reservation-date" type="date" value="${escapeHtml(state.tanggal)}" class="input h-9 py-1.5 text-xs">
                    </div>
                    <button type="button" data-reset class="btn-secondary btn-sm h-9">Reset</button>
                    <button type="button" data-refresh class="icon-btn h-9" title="Muat ulang" aria-label="Muat ulang reservasi">${icon('refresh', 'size-4')}</button>
                </div>
            </div>
        </div>

        <div id="reservation-content">
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-44 rounded-2xl"></div>').join('')}
            </div>
        </div>
    `;

    const openReservationForm = (reservation = null) => {
        const editing = Boolean(reservation);

        if (!state.customers.length) {
            toast('Tambahkan pelanggan terlebih dahulu sebelum membuat reservasi.', 'warning');
            navigate('pelanggan');
            return;
        }

        const selectedCustomer = reservation?.id_pelanggan;

        openModal({
            title: editing ? 'Ubah reservasi' : 'Reservasi baru',
            subtitle: editing
                ? `Perbarui jadwal reservasi #${reservation.id_reservasi}.`
                : 'Tentukan pelanggan, tanggal, dan jumlah tamu.',
            body: `
                <form id="reservation-form" class="space-y-4" novalidate>
                    <div>
                        <label for="id_pelanggan" class="field-label">Pelanggan</label>
                        <select id="id_pelanggan" name="id_pelanggan" required class="select">
                            <option value="">Pilih pelanggan</option>
                            ${state.customers.map((customer) => `
                                <option value="${customer.id_pelanggan}" ${String(customer.id_pelanggan) === String(selectedCustomer) ? 'selected' : ''}>
                                    ${escapeHtml(customer.nama_pelanggan)} · ${escapeHtml(customer.no_hp)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="tgl_reservasi" class="field-label">Tanggal</label>
                            <input id="tgl_reservasi" name="tgl_reservasi" type="date" required value="${editing ? escapeHtml(reservation.tgl_reservasi) : today()}" class="input">
                        </div>
                        <div>
                            <label for="waktu_reservasi" class="field-label">Waktu</label>
                            <input id="waktu_reservasi" name="waktu_reservasi" type="time" required value="${editing ? escapeHtml(formatTime(reservation.waktu_reservasi)) : '19:00'}" class="input">
                        </div>
                    </div>

                    <div>
                        <label for="jml_orang" class="field-label">Jumlah orang</label>
                        <input id="jml_orang" name="jml_orang" type="number" min="1" max="100" required value="${editing ? reservation.jml_orang : 2}" class="input">
                    </div>

                    ${editing ? `
                        <div>
                            <label for="status_reservasi" class="field-label">Status reservasi</label>
                            <select id="status_reservasi" name="status_reservasi" class="select">
                                <option value="pending" ${reservation.status_reservasi === 'pending' ? 'selected' : ''}>Menunggu</option>
                                <option value="dikonfirmasi" ${reservation.status_reservasi === 'dikonfirmasi' ? 'selected' : ''}>Dikonfirmasi</option>
                                <option value="selesai" ${reservation.status_reservasi === 'selesai' ? 'selected' : ''}>Selesai</option>
                                <option value="dibatalkan" ${reservation.status_reservasi === 'dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
                            </select>
                        </div>
                    ` : ''}

                    <div id="reservation-form-error"></div>
                </form>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">Batal</button>
                <button type="submit" form="reservation-form" id="reservation-submit" class="btn-primary">${editing ? 'Simpan perubahan' : 'Buat reservasi'}</button>
            `,
            onOpen: (panel, close) => {
                const form = panel.querySelector('#reservation-form');
                const errorBox = panel.querySelector('#reservation-form-error');
                const submit = panel.querySelector('#reservation-submit');

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    errorBox.innerHTML = '';

                    const values = formValues(form);

                    if (!values.id_pelanggan) {
                        errorBox.innerHTML = formError('Pilih pelanggan terlebih dahulu.');
                        return;
                    }

                    if (!values.tgl_reservasi || !values.waktu_reservasi) {
                        errorBox.innerHTML = formError('Tanggal dan waktu reservasi wajib diisi.');
                        return;
                    }

                    const when = new Date(`${values.tgl_reservasi}T${values.waktu_reservasi}:00`);
                    if (!editing && when.getTime() < Date.now()) {
                        errorBox.innerHTML = formError('Waktu reservasi tidak boleh di masa lalu.');
                        return;
                    }

                    const payload = {
                        id_pelanggan: Number(values.id_pelanggan),
                        tgl_reservasi: values.tgl_reservasi,
                        waktu_reservasi: values.waktu_reservasi,
                        jml_orang: Number(values.jml_orang),
                    };

                    if (editing && values.status_reservasi) {
                        payload.status_reservasi = values.status_reservasi;
                    }

                    setButtonLoading(submit, true, 'Menyimpan...');

                    try {
                        if (editing) {
                            await api.put(`reservasi/${reservation.id_reservasi}`, payload);
                            toast('Reservasi berhasil diperbarui.', 'success');
                        } else {
                            await api.post('reservasi', payload);
                            toast('Reservasi baru berhasil dibuat.', 'success');
                        }

                        close();
                        load(editing ? state.page : 1);
                    } catch (error) {
                        errorBox.innerHTML = formError(error?.firstError || error?.message || 'Reservasi gagal disimpan.');
                        setButtonLoading(submit, false);
                    }
                });
            },
        });
    };

    const updateStatus = async (reservation, status) => {
        try {
            await api.put(`reservasi/${reservation.id_reservasi}`, { status_reservasi: status });
            const label = status === 'dikonfirmasi' ? 'dikonfirmasi' : 'diselesaikan';
            toast(`Reservasi berhasil ${label}.`, 'success');
            load(state.page);
        } catch (error) {
            toast(error?.firstError || error?.message || 'Status reservasi gagal diperbarui.', 'error');
        }
    };

    const removeReservation = async (reservation) => {
        const confirmed = await confirmModal({
            title: 'Hapus reservasi?',
            message: `Reservasi untuk ${reservation.pelanggan?.nama_pelanggan || 'pelanggan ini'} pada ${formatDate(reservation.tgl_reservasi)} akan dihapus.`,
            confirmText: 'Ya, hapus',
            tone: 'danger',
            iconName: 'trash',
        });

        if (!confirmed) return;

        try {
            await api.delete(`reservasi/${reservation.id_reservasi}`);
            toast('Reservasi berhasil dihapus.', 'success');
            load(state.page);
        } catch (error) {
            toast(error?.message || 'Reservasi gagal dihapus.', 'error');
        }
    };

    const renderContent = (payload) => {
        const content = page.querySelector('#reservation-content');
        const reservations = payload.data || [];

        if (!reservations.length) {
            content.innerHTML = `
                <div class="card">
                    ${emptyState({
                        iconName: 'calendar',
                        title: 'Belum ada reservasi',
                        description: 'Reservasi yang dibuat akan muncul di sini.',
                        action: `<button type="button" data-add-empty class="btn-primary btn-sm">${icon('plus', 'size-3.5')} Buat reservasi</button>`,
                    })}
                </div>
            `;
            content.querySelector('[data-add-empty]')?.addEventListener('click', () => openReservationForm());
            return;
        }

        content.innerHTML = `
            <div class="mb-3 flex items-center justify-between text-xs text-coffee-400">
                <span>${payload.meta?.total || 0} reservasi ditemukan</span>
                <span class="hidden items-center gap-1 sm:flex">${icon('info', 'size-3')} Klik aksi untuk memperbarui status</span>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                ${reservations.map((reservation) => reservationCard(reservation, user)).join('')}
            </div>
            ${pagerHtml(payload.meta) ? `<div class="card mt-4 overflow-hidden">${pagerHtml(payload.meta)}</div>` : ''}
        `;

        content.querySelectorAll('[data-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const reservation = reservations.find((item) => String(item.id_reservasi) === button.dataset.edit);
                if (reservation) openReservationForm(reservation);
            });
        });

        content.querySelectorAll('[data-delete]').forEach((button) => {
            button.addEventListener('click', () => {
                const reservation = reservations.find((item) => String(item.id_reservasi) === button.dataset.delete);
                if (reservation) removeReservation(reservation);
            });
        });

        content.querySelectorAll('[data-confirm]').forEach((button) => {
            button.addEventListener('click', () => {
                const reservation = reservations.find((item) => String(item.id_reservasi) === button.dataset.confirm);
                if (reservation) updateStatus(reservation, 'dikonfirmasi');
            });
        });

        content.querySelectorAll('[data-complete]').forEach((button) => {
            button.addEventListener('click', () => {
                const reservation = reservations.find((item) => String(item.id_reservasi) === button.dataset.complete);
                if (reservation) updateStatus(reservation, 'selesai');
            });
        });

        bindPager(content, (nextPage) => load(nextPage));
    };

    const load = async (pageNumber = 1) => {
        const content = page.querySelector('#reservation-content');
        if (!content) return;

        content.innerHTML = `
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-44 rounded-2xl"></div>').join('')}
            </div>
        `;

        try {
            const [reservationResponse, customerResponse] = await Promise.all([
                api.get('reservasi', {
                    status_reservasi: state.status,
                    tanggal: state.tanggal,
                    per_page: 12,
                    page: pageNumber,
                }),
                state.customers.length ? Promise.resolve(null) : api.get('pelanggan', { per_page: 100 }),
            ]);

            if (signal.aborted) return;

            if (customerResponse) {
                state.customers = customerResponse.data || [];
            }

            state.page = Number(reservationResponse.meta?.current_page || pageNumber);
            state.lastData = reservationResponse;
            renderContent(reservationResponse);
        } catch (error) {
            if (signal.aborted) return;
            content.innerHTML = `<div class="card">${errorState(error?.message)}</div>`;
            content.querySelector('[data-retry]')?.addEventListener('click', () => load(pageNumber));
        }
    };

    await load(1);
    if (signal.aborted) return;

    page.addEventListener('click', (event) => {
        const statusButton = event.target.closest('[data-status]');
        if (statusButton) {
            state.status = statusButton.dataset.status;
            page.querySelectorAll('[data-status]').forEach((button) => {
                button.classList.toggle('tab-active', button.dataset.status === state.status);
            });
            load(1);
            return;
        }

        if (event.target.closest('[data-add]')) {
            openReservationForm();
            return;
        }

        if (event.target.closest('[data-reset]')) {
            state.status = '';
            state.tanggal = '';
            const dateInput = page.querySelector('#reservation-date');
            if (dateInput) dateInput.value = '';
            page.querySelectorAll('[data-status]').forEach((button) => {
                button.classList.toggle('tab-active', button.dataset.status === '');
            });
            load(1);
            return;
        }

        if (event.target.closest('[data-refresh]')) {
            load(state.page);
        }
    }, { signal });

    page.addEventListener('change', (event) => {
        if (event.target.id === 'reservation-date') {
            state.tanggal = event.target.value;
            load(1);
        }
    }, { signal });

    page.addEventListener('input', (event) => {
        if (event.target.id === 'reservation-date') {
            state.tanggal = event.target.value;
        }
    }, { signal });
}
