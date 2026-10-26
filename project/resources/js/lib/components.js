import { escapeHtml } from './format.js';
import { icon } from './icons.js';

export const invoiceNumber = (id) => `TT-${String(id ?? 0).padStart(5, '0')}`;

export const paidAmount = (transaksi) => (transaksi?.pembayaran || [])
    .filter((payment) => ['sebagian', 'lunas'].includes(payment.status_pembayaran))
    .reduce((total, payment) => total + Number(payment.jumlah_bayar || 0), 0);

export const remainingAmount = (transaksi) => Math.max(0, Number(transaksi?.total || 0) - paidAmount(transaksi));

export const customerName = (transaksi) => transaksi?.pelanggan?.nama_pelanggan || 'Pelanggan umum';

export function pageHead({ eyebrow = '', title, description = '', actions = '' }) {
    return `
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0">
                ${eyebrow ? `<p class="section-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
                <h1 class="font-display text-2xl font-semibold tracking-tight text-coffee-900 sm:text-3xl">${escapeHtml(title)}</h1>
                ${description ? `<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-coffee-500">${escapeHtml(description)}</p>` : ''}
            </div>
            ${actions ? `<div class="flex shrink-0 flex-wrap items-center gap-2">${actions}</div>` : ''}
        </div>
    `;
}

export function panelHead({ title, description = '', action = '' }) {
    return `
        <div class="flex flex-col gap-3 border-b border-coffee-200/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
                <h2 class="font-display text-lg font-semibold text-coffee-900">${escapeHtml(title)}</h2>
                ${description ? `<p class="mt-0.5 text-xs text-coffee-400">${escapeHtml(description)}</p>` : ''}
            </div>
            ${action}
        </div>
    `;
}

export function searchField({ id = 'search', placeholder = 'Cari...', value = '' }) {
    return `
        <div class="relative min-w-0 flex-1">
            <span class="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-coffee-300">
                ${icon('search', 'size-4')}
            </span>
            <input id="${id}" type="search" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"
                class="input h-10 pl-10" autocomplete="off">
        </div>
    `;
}

export function filterTabs({ name, options, active }) {
    return `
        <div class="flex gap-1 overflow-x-auto rounded-xl bg-coffee-100/70 p-1 scrollbar-none" data-filter-group="${name}">
            ${options.map((option) => `
                <button type="button" data-filter="${option.value}" class="tab ${active === option.value ? 'tab-active' : ''}">
                    ${escapeHtml(option.label)}
                </button>
            `).join('')}
        </div>
    `;
}

export function detailRow(label, value, { strong = false, muted = false } = {}) {
    return `
        <div class="flex items-start justify-between gap-4 py-1.5 text-sm">
            <span class="text-coffee-400">${escapeHtml(label)}</span>
            <span class="${strong ? 'font-semibold text-coffee-900' : muted ? 'text-coffee-400' : 'font-medium text-coffee-700'} text-right">${value}</span>
        </div>
    `;
}

export function formError(message) {
    return `<div class="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700">${escapeHtml(message)}</div>`;
}

export function segmentedRoles() {
    return '';
}
