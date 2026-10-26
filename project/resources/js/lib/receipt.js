import { paidAmount, remainingAmount, invoiceNumber } from './components.js';
import { escapeHtml, formatDateTime, rupiah } from './format.js';
import { icon } from './icons.js';
import { methodLabel, openModal } from './ui.js';

const itemsMarkup = (transaksi) => (transaksi.details || []).map((detail) => `
    <div class="flex items-start justify-between gap-3 py-1.5 text-[11px]">
        <div class="min-w-0">
            <p class="truncate font-medium text-coffee-800">${escapeHtml(detail.menu?.nama_menu || `Menu #${detail.id_menu}`)}</p>
            <p class="text-coffee-400">${detail.jumlah} x ${rupiah(detail.harga_satuan)}</p>
        </div>
        <p class="shrink-0 font-semibold text-coffee-800">${rupiah(detail.subtotal)}</p>
    </div>
`).join('');

export function receiptMarkup(transaksi) {
    const paid = paidAmount(transaksi);
    const remaining = remainingAmount(transaksi);
    const payments = (transaksi.pembayaran || []).filter((payment) => (
        ['sebagian', 'lunas'].includes(payment.status_pembayaran)
    ));

    return `
        <div class="space-y-4">
            <div class="rounded-2xl border border-dashed border-coffee-300 bg-white p-5">
                <div class="text-center">
                    <p class="font-display text-lg font-semibold text-coffee-900">Café Titik Temu</p>
                    <p class="text-[10px] font-semibold tracking-[0.2em] text-coffee-400 uppercase">Coffee &amp; Eatery</p>
                </div>

                <div class="my-4 border-t border-dashed border-coffee-200"></div>

                <div class="space-y-1.5 text-[11px]">
                    <div class="flex justify-between gap-3">
                        <span class="text-coffee-400">Invoice</span>
                        <span class="font-semibold text-coffee-800">${invoiceNumber(transaksi.id_transaksi)}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span class="text-coffee-400">Waktu</span>
                        <span class="text-coffee-700">${formatDateTime(transaksi.tanggal)}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span class="text-coffee-400">Pelanggan</span>
                        <span class="text-coffee-700">${escapeHtml(transaksi.pelanggan?.nama_pelanggan || 'Pelanggan umum')}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span class="text-coffee-400">Kasir</span>
                        <span class="text-coffee-700">${escapeHtml(transaksi.kasir?.nama_kasir || 'Pesanan online')}</span>
                    </div>
                    ${transaksi.kode_pesanan ? `
                        <div class="flex justify-between gap-3">
                            <span class="text-coffee-400">Kode</span>
                            <span class="font-mono text-[10px] text-coffee-600">${escapeHtml(String(transaksi.kode_pesanan).slice(0, 13).toUpperCase())}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="my-4 border-t border-dashed border-coffee-200"></div>

                <div class="divide-y divide-coffee-100">
                    ${itemsMarkup(transaksi) || '<p class="py-2 text-center text-[11px] text-coffee-300">Tidak ada item.</p>'}
                </div>

                <div class="my-4 border-t border-dashed border-coffee-200"></div>

                <div class="space-y-1.5 text-[11px]">
                    <div class="flex justify-between gap-3">
                        <span class="text-coffee-400">Total</span>
                        <span class="font-semibold text-coffee-800">${rupiah(transaksi.total)}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span class="text-coffee-400">Dibayar</span>
                        <span class="text-coffee-700">${rupiah(paid)}</span>
                    </div>
                    <div class="flex justify-between gap-3 border-t border-coffee-100 pt-1.5">
                        <span class="font-semibold text-coffee-700">Sisa</span>
                        <span class="font-display text-base font-semibold ${remaining > 0.001 ? 'text-amber-600' : 'text-sage-700'}">${rupiah(remaining)}</span>
                    </div>
                </div>

                ${payments.length ? `
                    <div class="mt-4 rounded-xl bg-cream-100/80 p-3">
                        <p class="mb-1.5 text-[10px] font-bold tracking-[0.12em] text-coffee-400 uppercase">Pembayaran</p>
                        ${payments.map((payment) => `
                            <div class="flex justify-between gap-3 py-0.5 text-[11px]">
                                <span class="text-coffee-500">${escapeHtml(methodLabel(payment.metode_pembayaran))}</span>
                                <span class="font-semibold text-coffee-800">${rupiah(payment.jumlah_bayar)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="my-4 border-t border-dashed border-coffee-200"></div>

                <p class="text-center text-[10px] leading-relaxed text-coffee-400">
                    Terima kasih sudah mampir.<br>
                    Sampai jumpa di cangkir berikutnya.
                </p>
            </div>
            <p class="text-center text-[10px] text-coffee-300">Simpan struk ini sebagai bukti pembayaran.</p>
        </div>
    `;
}

export function printReceipt(transaksi) {
    const paid = paidAmount(transaksi);
    const remaining = remainingAmount(transaksi);
    const payments = (transaksi.pembayaran || []).filter((payment) => (
        ['sebagian', 'lunas'].includes(payment.status_pembayaran)
    ));
    const rows = (transaksi.details || []).map((detail) => `
        <tr>
            <td>
                <div class="name">${escapeHtml(detail.menu?.nama_menu || `Menu #${detail.id_menu}`)}</div>
                <div class="muted">${detail.jumlah} x ${rupiah(detail.harga_satuan)}</div>
            </td>
            <td class="right">${rupiah(detail.subtotal)}</td>
        </tr>
    `).join('');
    const paymentRows = payments.map((payment) => `
        <tr>
            <td class="muted">${escapeHtml(methodLabel(payment.metode_pembayaran))}</td>
            <td class="right">${rupiah(payment.jumlah_bayar)}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>${invoiceNumber(transaksi.id_transaksi)}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 8px; background: #fff; color: #332016; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; }
        .sheet { width: 72mm; margin: 0 auto; }
        .brand { text-align: center; margin-bottom: 10px; }
        .brand h1 { margin: 0; font-size: 16px; letter-spacing: -.02em; }
        .brand p { margin: 2px 0 0; color: #8f6247; font-size: 8px; letter-spacing: .22em; text-transform: uppercase; }
        .line { border-top: 1px dashed #c8a88e; margin: 9px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
        .row span:first-child { color: #8f6247; }
        .row span:last-child { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 0; vertical-align: top; }
        .right { text-align: right; white-space: nowrap; font-weight: 600; }
        .name { font-weight: 600; }
        .muted { color: #ac8162; font-size: 9px; }
        .total { font-size: 14px; font-weight: 700; }
        .center { text-align: center; }
        .footer { margin-top: 10px; color: #8f6247; font-size: 9px; line-height: 1.5; }
        @page { margin: 0; size: 80mm auto; }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="brand">
            <h1>Café Titik Temu</h1>
            <p>Coffee &amp; Eatery</p>
        </div>

        <div class="row"><span>Invoice</span><span>${invoiceNumber(transaksi.id_transaksi)}</span></div>
        <div class="row"><span>Waktu</span><span>${formatDateTime(transaksi.tanggal)}</span></div>
        <div class="row"><span>Pelanggan</span><span>${escapeHtml(transaksi.pelanggan?.nama_pelanggan || 'Pelanggan umum')}</span></div>
        <div class="row"><span>Kasir</span><span>${escapeHtml(transaksi.kasir?.nama_kasir || 'Pesanan online')}</span></div>

        <div class="line"></div>

        <table>${rows}</table>

        <div class="line"></div>

        <div class="row"><span>Total</span><span>${rupiah(transaksi.total)}</span></div>
        <div class="row"><span>Dibayar</span><span>${rupiah(paid)}</span></div>
        <div class="row total"><span>Sisa</span><span>${rupiah(remaining)}</span></div>

        ${paymentRows ? `<div class="line"></div><table>${paymentRows}</table>` : ''}

        <div class="line"></div>
        <div class="footer center">
            Terima kasih sudah mampir.<br>
            Sampai jumpa di cangkir berikutnya.
        </div>
    </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.srcdoc = html;

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } finally {
                setTimeout(() => iframe.remove(), 1500);
            }
        }, 120);
    };

    document.body.appendChild(iframe);
}

export function showReceiptModal(transaksi, { autoPrint = false } = {}) {
    return openModal({
        title: 'Struk pembayaran',
        subtitle: `${invoiceNumber(transaksi.id_transaksi)} · ${transaksi.pelanggan?.nama_pelanggan || 'Pelanggan umum'}`,
        body: receiptMarkup(transaksi),
        footer: `
            <button type="button" data-modal-close class="btn-secondary">Tutup</button>
            <button type="button" data-print-receipt class="btn-primary">${icon('printer', 'size-4')} Cetak struk</button>
        `,
        onOpen: (panel) => {
            panel.querySelector('[data-print-receipt]')?.addEventListener('click', () => printReceipt(transaksi));

            if (autoPrint) {
                setTimeout(() => printReceipt(transaksi), 400);
            }
        },
    });
}
