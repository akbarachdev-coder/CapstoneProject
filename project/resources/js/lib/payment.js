import { api } from './api.js';
import { formError, invoiceNumber, paidAmount, remainingAmount } from './components.js';
import { rupiah } from './format.js';
import { icon } from './icons.js';
import { methodLabel, openModal, setButtonLoading, toast } from './ui.js';

export const PAYMENT_METHODS = [
    { value: 'tunai', label: 'Tunai', icon: 'banknote' },
    { value: 'qris', label: 'QRIS', icon: 'qr' },
    { value: 'debit', label: 'Debit', icon: 'card' },
    { value: 'kredit', label: 'Kredit', icon: 'card' },
    { value: 'transfer', label: 'Transfer', icon: 'wallet' },
    { value: 'e-wallet', label: 'E-Wallet', icon: 'wallet' },
];

export function openPaymentModal(transaksi, { onSuccess = null } = {}) {
    const total = Number(transaksi.total || 0);
    const paid = paidAmount(transaksi);
    const remaining = remainingAmount(transaksi);

    if (remaining <= 0.001) {
        toast('Transaksi ini sudah lunas.', 'info');
        return null;
    }

    const methodCards = PAYMENT_METHODS.map((method, index) => `
        <label class="cursor-pointer">
            <input type="radio" name="metode_pembayaran" value="${method.value}" class="peer sr-only" ${index === 0 ? 'checked' : ''}>
            <span class="flex flex-col items-center gap-1.5 rounded-xl border border-coffee-200 bg-white px-2 py-3 text-[11px] font-semibold text-coffee-500 transition hover:border-clay-300 peer-checked:border-clay-500 peer-checked:bg-clay-50 peer-checked:text-clay-700 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500/40">
                ${icon(method.icon, 'size-4.5')}
                ${method.label}
            </span>
        </label>
    `).join('');

    const { close } = openModal({
        title: 'Catat pembayaran',
        subtitle: `${invoiceNumber(transaksi.id_transaksi)} · ${transaksi.pelanggan?.nama_pelanggan || 'Pelanggan umum'}`,
        body: `
            <div class="space-y-5">
                <div class="overflow-hidden rounded-2xl bg-coffee-900 p-4 text-cream-50">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="text-[10px] font-semibold tracking-[0.16em] text-coffee-300 uppercase">Sisa tagihan</p>
                            <p class="mt-1 font-display text-2xl font-semibold tracking-tight">${rupiah(remaining)}</p>
                        </div>
                        <span class="flex size-11 items-center justify-center rounded-xl bg-white/10 text-clay-200">
                            ${icon('wallet', 'size-5')}
                        </span>
                    </div>
                    <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-[11px]">
                        <div>
                            <p class="text-coffee-300/70">Total tagihan</p>
                            <p class="mt-0.5 font-semibold">${rupiah(total)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-coffee-300/70">Sudah dibayar</p>
                            <p class="mt-0.5 font-semibold">${rupiah(paid)}</p>
                        </div>
                    </div>
                </div>

                <form id="payment-form" class="space-y-4" novalidate>
                    <div>
                        <span class="field-label">Metode pembayaran</span>
                        <div class="grid grid-cols-3 gap-2">
                            ${methodCards}
                        </div>
                    </div>

                    <div>
                        <label for="jumlah_bayar" class="field-label">Jumlah dibayar</label>
                        <div class="relative">
                            <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-xs font-semibold text-coffee-400">Rp</span>
                            <input id="jumlah_bayar" name="jumlah_bayar" type="number" inputmode="numeric" min="1" step="1"
                                value="${remaining}" class="input h-12 pl-11 font-display text-lg font-semibold">
                        </div>
                        <div class="mt-2 flex flex-wrap gap-2">
                            <button type="button" data-amount="${remaining}" class="btn-secondary btn-sm">Lunasi sisa</button>
                            <button type="button" data-amount="${Math.max(1, Math.floor(remaining / 2))}" class="btn-secondary btn-sm">Bayar sebagian</button>
                        </div>
                    </div>

                    <div id="payment-error"></div>

                    <div class="flex items-start gap-2.5 rounded-xl bg-cream-200/60 px-3.5 py-3 text-[11px] leading-relaxed text-coffee-500">
                        ${icon('info', 'size-4 shrink-0 text-clay-600')}
                        <p>Pembayaran sebagian diperbolehkan. Status transaksi otomatis berubah menjadi <span class="font-semibold text-coffee-700">Lunas</span> saat sisa tagihan terpenuhi.</p>
                    </div>
                </form>
            </div>
        `,
        footer: `
            <button type="button" data-modal-close class="btn-secondary">Batal</button>
            <button type="submit" form="payment-form" id="payment-submit" class="btn-primary">
                ${icon('checkCircle', 'size-4')}
                Simpan pembayaran
            </button>
        `,
        onOpen: (panel, modalClose) => {
            const form = panel.querySelector('#payment-form');
            const amount = panel.querySelector('#jumlah_bayar');
            const errorBox = panel.querySelector('#payment-error');
            const submit = panel.querySelector('#payment-submit');

            panel.querySelectorAll('[data-amount]').forEach((button) => {
                button.addEventListener('click', () => {
                    amount.value = button.dataset.amount;
                    amount.focus();
                    amount.select();
                });
            });

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                errorBox.innerHTML = '';

                const rawAmount = Number(amount.value);
                const method = new FormData(form).get('metode_pembayaran');

                if (!rawAmount || rawAmount <= 0) {
                    errorBox.innerHTML = formError('Jumlah pembayaran harus lebih dari nol.');
                    amount.focus();
                    return;
                }

                if (rawAmount > remaining + 0.001) {
                    errorBox.innerHTML = formError(`Jumlah melebihi sisa tagihan ${rupiah(remaining)}.`);
                    amount.focus();
                    return;
                }

                setButtonLoading(submit, true, 'Menyimpan...');

                try {
                    const response = await api.post(`transaksi/${transaksi.id_transaksi}/pembayaran`, {
                        metode_pembayaran: method,
                        jumlah_bayar: rawAmount,
                    });

                    const isFull = response?.data?.status_pembayaran === 'lunas';
                    toast(
                        isFull
                            ? `Pembayaran ${methodLabel(method)} lunas. Transaksi selesai.`
                            : `Pembayaran ${methodLabel(method)} berhasil dicatat.`,
                        'success',
                        isFull ? 'Transaksi lunas' : 'Pembayaran tersimpan',
                    );

                    modalClose();
                    onSuccess?.(response?.data || null);
                } catch (error) {
                    errorBox.innerHTML = formError(error?.firstError || error?.message || 'Pembayaran gagal disimpan.');
                    setButtonLoading(submit, false);
                }
            });
        },
    });

    return close;
}
