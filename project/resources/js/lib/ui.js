import { escapeHtml, initials } from './format.js';
import { icon } from './icons.js';

const TOAST_STYLES = {
    success: { border: 'border-sage-200', icon: 'checkCircle', iconClass: 'text-sage-600', title: 'Berhasil' },
    error: { border: 'border-rose-200', icon: 'alert', iconClass: 'text-rose-600', title: 'Gagal' },
    warning: { border: 'border-amber-200', icon: 'alert', iconClass: 'text-amber-600', title: 'Perhatian' },
    info: { border: 'border-sky-200', icon: 'info', iconClass: 'text-sky-600', title: 'Informasi' },
};

export function toast(message, type = 'success', title = null) {
    const root = document.getElementById('toast-root');
    if (!root) return;

    const style = TOAST_STYLES[type] || TOAST_STYLES.info;
    const el = document.createElement('div');
    el.className = `toast ${style.border}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
        <div class="mt-0.5 shrink-0 ${style.iconClass}">${icon(style.icon, 'size-5')}</div>
        <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-coffee-900">${escapeHtml(title || style.title)}</p>
            <p class="mt-0.5 text-xs leading-relaxed text-coffee-500">${escapeHtml(message)}</p>
        </div>
        <button type="button" class="icon-btn -m-1 size-7 shrink-0" aria-label="Tutup notifikasi">${icon('x', 'size-4')}</button>
    `;

    const remove = () => {
        el.style.transition = 'opacity .2s ease, transform .2s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => el.remove(), 220);
    };

    el.querySelector('button')?.addEventListener('click', remove);
    root.appendChild(el);
    setTimeout(remove, 4500);
}

export function openModal({
    title,
    subtitle = '',
    body,
    footer = '',
    wide = false,
    onOpen = null,
    onClose = null,
}) {
    const existing = document.querySelector('[data-modal-backdrop]');
    existing?.__close?.();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.dataset.modalBackdrop = 'true';
    backdrop.innerHTML = `
        <div class="modal-panel ${wide ? 'modal-panel-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-header">
                <div class="min-w-0">
                    <h2 id="modal-title" class="font-display text-xl font-semibold text-coffee-900">${escapeHtml(title)}</h2>
                    ${subtitle ? `<p class="mt-0.5 text-sm text-coffee-500">${escapeHtml(subtitle)}</p>` : ''}
                </div>
                <button type="button" data-modal-close class="icon-btn -m-1 shrink-0" aria-label="Tutup">${icon('x')}</button>
            </div>
            <div class="modal-body">${body}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
    `;

    document.body.appendChild(backdrop);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = backdrop.querySelector('.modal-panel');

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKeyDown);
        backdrop.remove();
        document.body.style.overflow = previousOverflow;
        onClose?.();
    };

    backdrop.__close = close;

    function onKeyDown(event) {
        if (event.key === 'Escape') close();
    }

    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop || event.target.closest('[data-modal-close]')) close();
    });

    document.addEventListener('keydown', onKeyDown);

    setTimeout(() => {
        if (!backdrop.isConnected) return;
        const focusTarget = panel.querySelector('input:not([type="hidden"]), select, textarea, button');
        focusTarget?.focus();
    }, 80);

    onOpen?.(panel, close);

    return { close, panel, backdrop };
}

export function confirmModal({
    title = 'Konfirmasi',
    message,
    confirmText = 'Ya, lanjutkan',
    cancelText = 'Batal',
    tone = 'danger',
    iconName = 'alert',
}) {
    return new Promise((resolve) => {
        let settled = false;
        const settle = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        openModal({
            title,
            body: `
                <div class="flex items-start gap-4">
                    <div class="flex size-11 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}">
                        ${icon(iconName, 'size-5')}
                    </div>
                    <p class="pt-1 text-sm leading-relaxed text-coffee-600">${escapeHtml(message)}</p>
                </div>
            `,
            footer: `
                <button type="button" data-modal-close class="btn-secondary">${escapeHtml(cancelText)}</button>
                <button type="button" data-confirm class="${tone === 'danger' ? 'btn-danger' : 'btn-primary'}">${escapeHtml(confirmText)}</button>
            `,
            onOpen: (panel, modalClose) => {
                panel.querySelector('[data-confirm]')?.addEventListener('click', () => {
                    settle(true);
                    modalClose();
                });
                panel.querySelectorAll('[data-modal-close]').forEach((button) => {
                    button.addEventListener('click', () => settle(false));
                });
            },
            onClose: () => settle(false),
        });
    });
}

export function setButtonLoading(button, loading, label = 'Memproses...') {
    if (!button) return;

    if (loading) {
        button.dataset.originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>${escapeHtml(label)}`;
    } else {
        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
            delete button.dataset.originalHtml;
        }
    }
}

export function statusMeta(status) {
    const map = {
        pending: { label: 'Menunggu', class: 'badge-pending', icon: 'clock' },
        dibayar: { label: 'Lunas', class: 'badge-paid', icon: 'checkCircle' },
        dibatalkan: { label: 'Dibatalkan', class: 'badge-cancelled', icon: 'x' },
        dikonfirmasi: { label: 'Dikonfirmasi', class: 'badge-info', icon: 'check' },
        selesai: { label: 'Selesai', class: 'badge-paid', icon: 'checkCircle' },
        lunas: { label: 'Lunas', class: 'badge-paid', icon: 'checkCircle' },
        sebagian: { label: 'Sebagian', class: 'badge-pending', icon: 'clock' },
        gagal: { label: 'Gagal', class: 'badge-cancelled', icon: 'x' },
        dikembalikan: { label: 'Dikembalikan', class: 'badge-neutral', icon: 'refresh' },
    };

    return map[status] || { label: status || '—', class: 'badge-neutral', icon: 'info' };
}

export function statusBadge(status) {
    const meta = statusMeta(status);
    return `<span class="${meta.class}">${meta.label}</span>`;
}

export function methodLabel(method) {
    const map = {
        tunai: 'Tunai',
        qris: 'QRIS',
        debit: 'Kartu Debit',
        kredit: 'Kartu Kredit',
        transfer: 'Transfer Bank',
        'e-wallet': 'E-Wallet',
    };

    return map[method] || method || '—';
}

export function methodIcon(method) {
    const map = {
        tunai: 'banknote',
        qris: 'qr',
        debit: 'card',
        kredit: 'card',
        transfer: 'wallet',
        'e-wallet': 'wallet',
    };

    return icon(map[method] || 'wallet', 'size-4');
}

export function emptyState({ iconName = 'receipt', title, description = '', action = '' }) {
    return `
        <div class="empty-state">
            <div class="flex size-14 items-center justify-center rounded-2xl bg-cream-200/70 text-coffee-400">
                ${icon(iconName, 'size-6')}
            </div>
            <div>
                <p class="font-display text-lg font-semibold text-coffee-800">${escapeHtml(title)}</p>
                ${description ? `<p class="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-coffee-400">${escapeHtml(description)}</p>` : ''}
            </div>
            ${action}
        </div>
    `;
}

export function errorState(message = 'Data gagal dimuat. Silakan coba lagi.', retryId = 'retry') {
    return `
        <div class="empty-state">
            <div class="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                ${icon('alert', 'size-6')}
            </div>
            <div>
                <p class="font-display text-lg font-semibold text-coffee-800">Terjadi kendala</p>
                <p class="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-coffee-400">${escapeHtml(message)}</p>
            </div>
            <button type="button" data-${retryId} class="btn-secondary btn-sm">${icon('refresh', 'size-4')} Coba lagi</button>
        </div>
    `;
}

export function avatar(name, size = 'size-10', tone = 'bg-coffee-800 text-cream-50') {
    return `<span class="flex ${size} shrink-0 items-center justify-center rounded-full ${tone} text-xs font-bold tracking-wide">${escapeHtml(initials(name))}</span>`;
}

export function pagerHtml(meta) {
    if (!meta || meta.last_page <= 1) return '';

    const current = Number(meta.current_page);
    const last = Number(meta.last_page);
    const pages = [];
    const start = Math.max(1, Math.min(current - 2, last - 4));
    const end = Math.min(last, start + 4);

    for (let page = start; page <= end; page += 1) pages.push(page);

    return `
        <div class="flex flex-col gap-3 border-t border-coffee-200/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p class="text-xs text-coffee-400">
                Menampilkan <span class="font-semibold text-coffee-700">${meta.from ?? 0}–${meta.to ?? 0}</span>
                dari <span class="font-semibold text-coffee-700">${meta.total ?? 0}</span> data
            </p>
            <div class="flex items-center gap-1">
                <button type="button" class="icon-btn size-8" data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">
                    ${icon('chevronLeft', 'size-4')}
                </button>
                ${pages.map((page) => `
                    <button type="button" class="flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                        page === current
                            ? 'bg-coffee-900 text-cream-50'
                            : 'text-coffee-500 hover:bg-coffee-100 hover:text-coffee-800'
                    }" data-page="${page}">${page}</button>
                `).join('')}
                <button type="button" class="icon-btn size-8" data-page="${current + 1}" ${current >= last ? 'disabled' : ''} aria-label="Halaman berikutnya">
                    ${icon('chevronRight', 'size-4')}
                </button>
            </div>
        </div>
    `;
}

export function bindPager(container, handler) {
    container.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', () => {
            const page = Number(button.dataset.page);
            if (!button.disabled && page > 0) handler(page);
        });
    });
}

export function debounce(fn, delay = 320) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
        data[key] = value;
    });
    return data;
}

export function pageSkeleton() {
    return `
        <div class="space-y-6">
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                ${Array.from({ length: 4 }).map(() => `
                    <div class="card p-5">
                        <div class="skeleton h-3 w-24"></div>
                        <div class="skeleton mt-4 h-7 w-32"></div>
                        <div class="skeleton mt-3 h-3 w-20"></div>
                    </div>
                `).join('')}
            </div>
            <div class="card p-5">
                <div class="skeleton h-4 w-40"></div>
                <div class="mt-5 space-y-3">
                    ${Array.from({ length: 6 }).map(() => `<div class="skeleton h-11 w-full"></div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

export function tableSkeleton(rows = 6) {
    return `
        <div class="card overflow-hidden">
            <div class="space-y-3 p-5">
                ${Array.from({ length: rows }).map(() => `<div class="skeleton h-12 w-full"></div>`).join('')}
            </div>
        </div>
    `;
}

export function statCard({ label, value, hint, iconName, tone = 'clay', trend = null, id = '' }) {
    const tones = {
        clay: 'bg-clay-100 text-clay-700',
        sage: 'bg-sage-100 text-sage-700',
        coffee: 'bg-coffee-100 text-coffee-700',
        sky: 'bg-sky-50 text-sky-700',
        amber: 'bg-amber-50 text-amber-700',
    };

    return `
        <div class="kpi-card">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p class="text-xs font-semibold tracking-wide text-coffee-400">${escapeHtml(label)}</p>
                    <p class="mt-2 font-display text-2xl font-semibold tracking-tight text-coffee-900" ${id ? `id="${id}"` : ''}>${value}</p>
                    ${hint ? `<p class="mt-1.5 flex items-center gap-1 text-[11px] text-coffee-400">${hint}</p>` : ''}
                </div>
                <span class="flex size-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.clay}">
                    ${icon(iconName, 'size-5')}
                </span>
            </div>
            ${trend || ''}
        </div>
    `;
}
