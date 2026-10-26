import { api } from '../lib/api.js';
import { pageHead } from '../lib/components.js';
import { escapeHtml, formatDate, formatNumber, rupiah, daysAgo, today, toInputDate } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { errorState, methodIcon, methodLabel, statCard } from '../lib/ui.js';

const DAY_MS = 86400000;

const buildRange = (dari, sampai) => {
    const start = new Date(`${dari}T00:00:00`);
    const end = new Date(`${sampai}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

    const days = [];
    for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
        const date = new Date(time);
        const iso = toInputDate(date);
        days.push({
            iso,
            date,
            label: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date),
            weekday: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date),
            total: 0,
            count: 0,
        });
    }

    return days;
};

const chartMarkup = (days, isRevenue = false) => {
    if (!days.length) return '';

    const max = Math.max(...days.map((day) => day.total), 1);
    const hasSales = days.some((day) => day.total > 0);
    const compact = days.length > 14;

    return `
        <div class="card overflow-hidden print-area">
            <div class="flex flex-col gap-2 border-b border-coffee-200/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <h2 class="font-display text-lg font-semibold text-coffee-900">${isRevenue ? 'Pendapatan per hari' : 'Penjualan per hari'}</h2>
                    <p class="mt-0.5 text-xs text-coffee-400">${days.length} hari dalam periode ini</p>
                </div>
                <span class="badge-neutral">${formatNumber(days.reduce((total, day) => total + day.count, 0))} ${isRevenue ? 'pembayaran' : 'transaksi'}</span>
            </div>

            <div class="overflow-x-auto px-5 py-6 sm:px-6">
                <div class="flex h-56 items-end gap-1.5 ${compact ? 'min-w-[720px]' : ''}">
                    ${days.map((day) => {
                        const height = hasSales ? Math.max(4, (day.total / max) * 100) : 3;
                        const highlight = day.iso === today();
                        return `
                            <div class="group relative flex h-full flex-1 flex-col items-center justify-end gap-2">
                                <div class="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-coffee-900 px-2.5 py-1.5 text-[10px] font-semibold text-cream-50 shadow-lg group-hover:block">
                                    ${rupiah(day.total)} · ${day.count} trx
                                </div>
                                <div class="flex w-full flex-1 items-end">
                                    <div class="w-full rounded-t-md bg-gradient-to-t ${highlight ? 'from-clay-600 to-clay-400' : 'from-coffee-800 to-coffee-500'} transition-all duration-500 group-hover:from-clay-700 group-hover:to-clay-400" style="height: ${height}%"></div>
                                </div>
                                <span class="text-[9px] font-semibold ${highlight ? 'text-clay-600' : 'text-coffee-400'}">${day.label}</span>
                                ${compact ? `<span class="text-[8px] text-coffee-300">${day.weekday}</span>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${hasSales ? '' : `<p class="mt-4 text-center text-xs text-coffee-400">Tidak ada ${isRevenue ? 'pendapatan' : 'penjualan'} pada periode ini.</p>`}
            </div>
        </div>
    `;
};

const methodMarkup = (methods) => {
    const total = methods.reduce((sum, method) => sum + Number(method.total || 0), 0);
    const sorted = [...methods].sort((a, b) => Number(b.total) - Number(a.total));

    return `
        <div class="card overflow-hidden print-area">
            <div class="border-b border-coffee-200/60 px-5 py-4">
                <h2 class="font-display text-lg font-semibold text-coffee-900">Metode pembayaran</h2>
                <p class="mt-0.5 text-xs text-coffee-400">Distribusi pembayaran yang diterima</p>
            </div>
            <div class="p-5">
                ${sorted.length ? `
                    <div class="space-y-4">
                        ${sorted.map((method) => {
                            const value = Number(method.total || 0);
                            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `
                                <div>
                                    <div class="flex items-center justify-between gap-3">
                                        <div class="flex min-w-0 items-center gap-2">
                                            <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-coffee-100 text-coffee-600">${methodIcon(method.metode_pembayaran)}</span>
                                            <div class="min-w-0">
                                                <p class="truncate text-xs font-semibold text-coffee-700">${escapeHtml(methodLabel(method.metode_pembayaran))}</p>
                                                <p class="text-[10px] text-coffee-300">${formatNumber(method.jumlah_pembayaran)} pembayaran</p>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-xs font-semibold text-coffee-800">${rupiah(value)}</p>
                                            <p class="text-[10px] text-coffee-300">${percent}%</p>
                                        </div>
                                    </div>
                                    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-coffee-100">
                                        <div class="h-full rounded-full bg-gradient-to-r from-clay-500 to-clay-400" style="width: ${percent}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <div class="flex flex-col items-center gap-2 py-8 text-center">
                        <span class="flex size-12 items-center justify-center rounded-2xl bg-cream-200/70 text-coffee-300">${icon('wallet', 'size-5')}</span>
                        <p class="text-sm font-semibold text-coffee-600">Belum ada pembayaran</p>
                        <p class="text-xs text-coffee-400">Pembayaran pada periode ini akan tampil di sini.</p>
                    </div>
                `}
            </div>
        </div>
    `;
};

const dailyTable = (days, isRevenue = false) => `
    <div class="card overflow-hidden print-area">
        <div class="flex items-center justify-between border-b border-coffee-200/60 px-5 py-4 sm:px-6">
            <div>
                <h2 class="font-display text-lg font-semibold text-coffee-900">Rincian harian</h2>
                <p class="mt-0.5 text-xs text-coffee-400">${isRevenue ? 'Rekap pembayaran dan pendapatan per tanggal' : 'Rekap transaksi dan omzet per tanggal'}</p>
            </div>
            <span class="badge-neutral">${days.length} hari</span>
        </div>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th class="text-right">${isRevenue ? 'Pembayaran' : 'Transaksi'}</th>
                        <th class="text-right">${isRevenue ? 'Pendapatan' : 'Omzet'}</th>
                        <th class="text-right">Rata-rata</th>
                    </tr>
                </thead>
                <tbody>
                    ${days.map((day) => `
                        <tr>
                            <td>
                                <p class="font-medium text-coffee-800">${formatDate(day.date)}</p>
                                <p class="text-[10px] text-coffee-300">${escapeHtml(day.weekday)}</p>
                            </td>
                            <td class="text-right">${formatNumber(day.count)}</td>
                            <td class="text-right font-semibold text-coffee-800">${rupiah(day.total)}</td>
                            <td class="text-right text-coffee-500">${day.count ? rupiah(day.total / day.count) : '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
`;

export async function renderLaporan({ page, signal, mode = 'penjualan' }) {
    const isRevenue = mode === 'pendapatan';
    const state = {
        dari: daysAgo(6),
        sampai: today(),
        report: null,
    };

    const renderFrame = () => {
        page.innerHTML = `
            ${pageHead({
                eyebrow: 'Analitik',
                title: isRevenue ? 'Laporan pendapatan' : 'Laporan penjualan',
                description: isRevenue
                    ? 'Pantau pembayaran yang diterima dan pendapatan Café Titik Temu.'
                    : 'Analisis omzet, transaksi, dan metode pembayaran Café Titik Temu.',
                actions: `
                    <button type="button" data-print class="btn-secondary no-print">${icon('printer', 'size-4')} Cetak laporan</button>
                `,
            })}

            <div class="card mb-5 p-3.5 no-print">
                <form id="report-form" class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div class="flex flex-wrap items-end gap-2">
                        <div>
                            <label for="report-dari" class="mb-1 block text-[10px] font-semibold tracking-wide text-coffee-400">Dari tanggal</label>
                            <input id="report-dari" type="date" value="${state.dari}" max="${today()}" class="input h-10 py-2 text-xs">
                        </div>
                        <span class="pb-3 text-[10px] text-coffee-300">s/d</span>
                        <div>
                            <label for="report-sampai" class="mb-1 block text-[10px] font-semibold tracking-wide text-coffee-400">Sampai tanggal</label>
                            <input id="report-sampai" type="date" value="${state.sampai}" max="${today()}" class="input h-10 py-2 text-xs">
                        </div>
                        <button type="submit" class="btn-primary h-10">${icon('chart', 'size-4')} Tampilkan</button>
                    </div>

                    <div class="flex flex-wrap gap-1 rounded-xl bg-coffee-100/70 p-1">
                        <button type="button" data-preset="1" class="tab">Hari ini</button>
                        <button type="button" data-preset="7" class="tab">7 hari</button>
                        <button type="button" data-preset="30" class="tab">30 hari</button>
                    </div>
                </form>
            </div>

            <div id="report-content">
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    ${Array.from({ length: 4 }).map(() => '<div class="skeleton h-28 rounded-2xl"></div>').join('')}
                </div>
                <div class="mt-5 grid gap-5 xl:grid-cols-3">
                    <div class="skeleton h-80 rounded-2xl xl:col-span-2"></div>
                    <div class="skeleton h-80 rounded-2xl"></div>
                </div>
            </div>
        `;
    };

    const renderReport = (report) => {
        const content = page.querySelector('#report-content');
        const summary = report.ringkasan || {};
        const methods = report.per_metode_pembayaran || [];
        const days = buildRange(report.periode?.dari || state.dari, report.periode?.sampai || state.sampai);
        const dayMap = new Map(days.map((day) => [day.iso, day]));

        (report.per_hari || []).forEach((row) => {
            const iso = String(row.tanggal).slice(0, 10);
            const day = dayMap.get(iso);
            if (day) {
                day.total = Number((isRevenue ? row.total_pendapatan : row.total_penjualan) || 0);
                day.count = Number((isRevenue ? row.jumlah_pembayaran : row.jumlah_transaksi) || 0);
            }
        });

        const totalTransactions = Number((isRevenue ? summary.jumlah_pembayaran : summary.jumlah_transaksi) || 0);
        const totalSales = Number((isRevenue ? summary.total_pendapatan : summary.total_penjualan) || 0);
        const average = totalTransactions ? totalSales / totalTransactions : 0;
        const topMethod = methods.length
            ? [...methods].sort((a, b) => Number(b.total) - Number(a.total))[0]
            : null;

        content.innerHTML = `
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                ${statCard({
                    label: isRevenue ? 'Total pendapatan' : 'Total penjualan',
                    value: rupiah(totalSales),
                    hint: `${formatDate(report.periode?.dari)} – ${formatDate(report.periode?.sampai)}`,
                    iconName: 'coin',
                    tone: 'sage',
                })}
                ${statCard({
                    label: isRevenue ? 'Jumlah pembayaran' : 'Jumlah transaksi',
                    value: formatNumber(totalTransactions),
                    hint: `${days.filter((day) => day.count > 0).length} hari aktif`,
                    iconName: isRevenue ? 'wallet' : 'receipt',
                    tone: 'clay',
                })}
                ${statCard({
                    label: isRevenue ? 'Rata-rata pendapatan' : 'Rata-rata transaksi',
                    value: rupiah(average),
                    hint: isRevenue ? 'Per pembayaran pada periode ini' : 'Per transaksi pada periode ini',
                    iconName: 'trendingUp',
                    tone: 'coffee',
                })}
                ${statCard({
                    label: 'Metode terpopuler',
                    value: topMethod ? methodLabel(topMethod.metode_pembayaran) : '–',
                    hint: topMethod ? `${rupiah(topMethod.total)} diterima` : 'Belum ada pembayaran',
                    iconName: 'wallet',
                    tone: 'amber',
                })}
            </div>

            <div class="mt-5 grid gap-5 xl:grid-cols-3">
                <div class="xl:col-span-2">${chartMarkup(days, isRevenue)}</div>
                ${methodMarkup(methods)}
            </div>

            <div class="mt-5">${dailyTable(days, isRevenue)}</div>
        `;
    };

    const load = async () => {
        renderFrame();

        if (state.dari > state.sampai) {
            const content = page.querySelector('#report-content');
            content.innerHTML = `<div class="card">${errorState('Tanggal awal tidak boleh melewati tanggal akhir.')}</div>`;
            content.querySelector('[data-retry]')?.addEventListener('click', load);
            return;
        }

        const spanDays = Math.round((new Date(`${state.sampai}T00:00:00`) - new Date(`${state.dari}T00:00:00`)) / DAY_MS) + 1;
        if (spanDays > 31) {
            const content = page.querySelector('#report-content');
            content.innerHTML = `<div class="card">${errorState('Rentang laporan maksimal 31 hari. Silakan persempit periode.')}</div>`;
            content.querySelector('[data-retry]')?.addEventListener('click', load);
            return;
        }

        try {
            const response = await api.get(isRevenue ? 'laporan/pendapatan' : 'laporan/penjualan', {
                dari: state.dari,
                sampai: state.sampai,
            });

            if (signal.aborted) return;
            state.report = response.data;
            renderReport(response.data);
        } catch (error) {
            if (signal.aborted) return;
            const content = page.querySelector('#report-content');
            content.innerHTML = `<div class="card">${errorState(error?.message)}</div>`;
            content.querySelector('[data-retry]')?.addEventListener('click', load);
        }
    };

    await load();
    if (signal.aborted) return;

    page.addEventListener('submit', (event) => {
        if (event.target.id !== 'report-form') return;
        event.preventDefault();
        state.dari = page.querySelector('#report-dari').value;
        state.sampai = page.querySelector('#report-sampai').value;
        load();
    }, { signal });

    page.addEventListener('click', (event) => {
        const preset = event.target.closest('[data-preset]');
        if (preset) {
            const days = Number(preset.dataset.preset);
            state.dari = daysAgo(days - 1);
            state.sampai = today();
            load();
            return;
        }

        if (event.target.closest('[data-print]')) {
            window.print();
        }
    }, { signal });
}
