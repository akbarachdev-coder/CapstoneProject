import { api } from "../lib/api.js";
import {
    pageHead,
    invoiceNumber,
    customerName,
    paidAmount,
} from "../lib/components.js";
import {
    escapeHtml,
    formatDate,
    formatTime,
    greeting,
    formatNumber,
    rupiah,
    toInputDate,
    today,
} from "../lib/format.js";
import { icon } from "../lib/icons.js";
import {
    emptyState,
    errorState,
    openModal,
    statCard,
    statusBadge,
    toast,
} from "../lib/ui.js";
import { openPaymentModal } from "../lib/payment.js";

const buildDays = (count = 7) =>
    Array.from({ length: count }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (count - 1 - index));
        return {
            date,
            iso: toInputDate(date),
            label: new Intl.DateTimeFormat("id-ID", {
                weekday: "short",
            }).format(date),
            full: new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
            }).format(date),
            total: 0,
            count: 0,
        };
    });

const chartMarkup = (days, total) => {
    const max = Math.max(...days.map((day) => day.total), 1);
    const hasSales = days.some((day) => day.total > 0);

    return `
        <div class="card overflow-hidden">
            <div class="flex flex-col gap-2 border-b border-coffee-200/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <h2 class="font-display text-lg font-semibold text-coffee-900">Tren penjualan</h2>
                    <p class="mt-0.5 text-xs text-coffee-400">Rekap transaksi 7 hari terakhir</p>
                </div>
                <div class="text-left sm:text-right">
                    <p class="text-[10px] font-semibold tracking-[0.14em] text-coffee-400 uppercase">Total</p>
                    <p class="font-display text-xl font-semibold text-coffee-900">${rupiah(total)}</p>
                </div>
            </div>

            <div class="px-5 py-6 sm:px-6">
                <div class="flex h-44 items-end gap-2 sm:gap-3">
                    ${days
                        .map((day) => {
                            const height = hasSales
                                ? Math.max(5, (day.total / max) * 100)
                                : 3;
                            const highlight = day.iso === today();
                            return `
                            <div class="group relative flex h-full flex-1 flex-col items-center justify-end gap-2">
                                <div class="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-coffee-900 px-2.5 py-1.5 text-[10px] font-semibold text-cream-50 shadow-lg group-hover:block">
                                    ${rupiah(day.total)} · ${day.count} trx
                                </div>
                                <div class="relative flex w-full flex-1 items-end">
                                    <div class="w-full rounded-t-lg bg-linear-to-t ${highlight ? "from-clay-600 to-clay-400" : "from-coffee-800 to-coffee-500"} transition-all duration-500 group-hover:from-clay-700 group-hover:to-clay-400" style="height: ${height}%"></div>
                                </div>
                                <span class="text-[10px] font-semibold ${highlight ? "text-clay-600" : "text-coffee-400"}">${day.label}</span>
                                <span class="text-[9px] text-coffee-300">${day.full}</span>
                            </div>
                        `;
                        })
                        .join("")}
                </div>
                ${hasSales ? "" : '<p class="mt-4 text-center text-xs text-coffee-400">Belum ada penjualan pada periode ini.</p>'}
            </div>
        </div>
    `;
};

const pendingMarkup = (transactions) => {
    const pending = transactions
        .filter((trx) => trx.status === "pending")
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .slice(0, 4);

    return `
        <div class="card flex h-full flex-col overflow-hidden">
            <div class="flex items-center justify-between border-b border-coffee-200/60 px-5 py-4">
                <div>
                    <h2 class="font-display text-lg font-semibold text-coffee-900">Perlu ditindaklanjuti</h2>
                    <p class="mt-0.5 text-xs text-coffee-400">Transaksi menunggu pembayaran</p>
                </div>
                <span class="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    ${icon("clock", "size-4.5")}
                </span>
            </div>

            ${
                pending.length
                    ? `
                <div class="flex-1 divide-y divide-coffee-100">
                    ${pending
                        .map((trx) => {
                            const remaining =
                                Number(trx.total) - paidAmount(trx);
                            return `
                            <div class="flex items-center gap-3 px-5 py-3.5">
                                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream-200/70 text-coffee-500">
                                    ${icon("receipt", "size-4")}
                                </span>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-xs font-semibold text-coffee-800">${invoiceNumber(trx.id_transaksi)}</p>
                                    <p class="mt-0.5 truncate text-[11px] text-coffee-400">${escapeHtml(customerName(trx))}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs font-semibold text-coffee-800">${rupiah(remaining)}</p>
                                    <button type="button" data-pay-id="${trx.id_transaksi}" class="text-[10px] font-bold text-clay-600 hover:text-clay-700">Bayar →</button>
                                </div>
                            </div>
                        `;
                        })
                        .join("")}
                </div>
                <a href="#/transaksi?status=pending" class="flex items-center justify-center gap-1.5 border-t border-coffee-200/60 px-5 py-3 text-xs font-semibold text-coffee-500 transition hover:bg-cream-50 hover:text-coffee-800">
                    Lihat semua transaksi
                    ${icon("arrowRight", "size-3.5")}
                </a>
            `
                    : `
                <div class="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                    <span class="flex size-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
                        ${icon("checkCircle", "size-5")}
                    </span>
                    <p class="text-sm font-semibold text-coffee-700">Semua beres!</p>
                    <p class="text-xs text-coffee-400">Tidak ada transaksi yang menunggu.</p>
                </div>
            `
            }
        </div>
    `;
};

const recentMarkup = (transactions) => `
    <div class="card overflow-hidden">
        <div class="flex items-center justify-between border-b border-coffee-200/60 px-5 py-4 sm:px-6">
            <div>
                <h2 class="font-display text-lg font-semibold text-coffee-900">Transaksi terbaru</h2>
                <p class="mt-0.5 text-xs text-coffee-400">Aktivitas terakhir di meja kasir</p>
            </div>
            <a href="#/transaksi" class="btn-secondary btn-sm">
                ${icon("list", "size-3.5")}
                Lihat semua
            </a>
        </div>

        ${
            transactions.length
                ? `
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Pelanggan</th>
                            <th>Waktu</th>
                            <th>Kasir</th>
                            <th class="text-right">Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions
                            .map(
                                (trx) => `
                            <tr data-open-trx="${trx.id_transaksi}" class="cursor-pointer">
                                <td>
                                    <span class="font-semibold text-coffee-800">${invoiceNumber(trx.id_transaksi)}</span>
                                </td>
                                <td>
                                    <span class="block max-w-40 truncate">${escapeHtml(customerName(trx))}</span>
                                </td>
                                <td>
                                    <span class="text-xs text-coffee-400">${formatDate(trx.tanggal)} · ${formatTime(trx.tanggal)}</span>
                                </td>
                                <td>
                                    <span class="text-xs">${escapeHtml(trx.kasir?.nama_kasir || "—")}</span>
                                </td>
                                <td class="text-right font-semibold text-coffee-800">${rupiah(trx.total)}</td>
                                <td>${statusBadge(trx.status)}</td>
                            </tr>
                        `,
                            )
                            .join("")}
                    </tbody>
                </table>
            </div>
        `
                : emptyState({
                      iconName: "receipt",
                      title: "Belum ada transaksi",
                      description:
                          "Transaksi yang Anda catat akan muncul di sini.",
                      action: '<a href="#/transaksi-baru" class="btn-primary btn-sm">Buat transaksi pertama</a>',
                  })
        }
    </div>
`;

export async function renderDashboard({ user, page, signal, navigate }) {
    const load = async () => {
        page.innerHTML = `
            <div class="space-y-6">
                <div class="skeleton h-44 w-full rounded-3xl"></div>
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    ${Array.from({ length: 4 })
                        .map(
                            () =>
                                `<div class="card p-5"><div class="skeleton h-3 w-20"></div><div class="skeleton mt-4 h-7 w-28"></div></div>`,
                        )
                        .join("")}
                </div>
                <div class="grid gap-5 xl:grid-cols-3">
                    <div class="skeleton h-80 rounded-2xl xl:col-span-2"></div>
                    <div class="skeleton h-80 rounded-2xl"></div>
                </div>
            </div>
        `;

        let transactions = [];
        let menuTotal = 0;
        let customerTotal = 0;
        let report = null;

        try {
            const [trxResponse, menuResponse, customerResponse] =
                await Promise.all([
                    api.get("transaksi", { per_page: 100 }),
                    api
                        .get("menu", { per_page: 1 })
                        .catch(() => ({ meta: { total: 0 } })),
                    api
                        .get("pelanggan", { per_page: 1 })
                        .catch(() => ({ meta: { total: 0 } })),
                ]);

            transactions = trxResponse.data || [];
            menuTotal = Number(menuResponse.meta?.total || 0);
            customerTotal = Number(customerResponse.meta?.total || 0);

            if (user.role === "admin") {
                report = await api
                    .get("laporan/penjualan", {
                        dari: toInputDate(new Date(Date.now() - 6 * 86400000)),
                        sampai: today(),
                    })
                    .catch(() => null);
            }
        } catch (error) {
            if (signal.aborted) return;
            page.innerHTML = `
                ${pageHead({ eyebrow: "Dashboard", title: "Ringkasan" })}
                <div class="card">${errorState(error.message)}</div>
            `;
            page.querySelector("[data-retry]")?.addEventListener("click", load);
            return;
        }

        if (signal.aborted) return;

        const days = buildDays(7);
        const dailyMap = new Map(days.map((day) => [day.iso, day]));

        if (user.role === "admin" && report) {
            (report.data.per_hari || []).forEach((row) => {
                const iso = String(row.tanggal).slice(0, 10);
                const day = dailyMap.get(iso);
                if (day) {
                    day.total = Number(row.total_penjualan || 0);
                    day.count = Number(row.jumlah_transaksi || 0);
                }
            });
        } else {
            transactions.forEach((trx) => {
                if (trx.status === "dibatalkan") return;
                const day = dailyMap.get(toInputDate(trx.tanggal));
                if (day) {
                    day.total += Number(trx.total || 0);
                    day.count += 1;
                }
            });
        }

        const todayKey = today();
        const todayTransactions = transactions.filter(
            (trx) =>
                toInputDate(trx.tanggal) === todayKey &&
                trx.status !== "dibatalkan",
        );
        const todayCount = report
            ? Number(
                  (report.data.per_hari || []).find(
                      (row) => String(row.tanggal).slice(0, 10) === todayKey,
                  )?.jumlah_transaksi || 0,
              )
            : todayTransactions.length;
        const todayRevenue = report
            ? Number(
                  (report.data.per_hari || []).find(
                      (row) => String(row.tanggal).slice(0, 10) === todayKey,
                  )?.total_penjualan || 0,
              )
            : todayTransactions.reduce(
                  (total, trx) => total + Number(trx.total || 0),
                  0,
              );
        const pendingCount = transactions.filter(
            (trx) => trx.status === "pending",
        ).length;
        const weeklyRevenue = days.reduce((total, day) => total + day.total, 0);
        const average = todayCount > 0 ? todayRevenue / todayCount : 0;
        const recent = [...transactions]
            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
            .slice(0, 6);

        page.innerHTML = `
            <section class="relative mb-6 overflow-hidden rounded-3xl bg-coffee-950 p-6 text-cream-50 shadow-lift sm:p-8">
                <div class="pointer-events-none absolute inset-0 bg-grain opacity-50"></div>
                <div class="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-clay-500/25 blur-3xl"></div>
                <div class="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-sage-500/15 blur-3xl"></div>

                <div class="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                    <div class="max-w-2xl">
                        <p class="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-clay-200 uppercase">
                            ${icon("sun", "size-3.5")}
                            ${escapeHtml(formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}
                        </p>
                        <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                            ${greeting()}, ${escapeHtml(user.name.split(" ")[0])}.
                        </h1>
                        <p class="mt-2 max-w-lg text-sm leading-relaxed text-coffee-200/80">
                            ${
                                todayCount > 0
                                    ? `Sudah ada <span class="font-semibold text-cream-50">${todayCount} transaksi</span> tercatat hari ini dengan omzet ${rupiah(todayRevenue)}.`
                                    : "Belum ada transaksi hari ini. Yuk mulai catat pesanan pertama Anda."
                            }
                        </p>
                        <div class="mt-5 flex flex-wrap gap-2">
                            <a href="#/transaksi-baru" class="btn-accent">
                                ${icon("plus", "size-4")}
                                Transaksi baru
                            </a>
                            <a href="#/transaksi?status=pending" class="btn border border-white/15 bg-white/5 text-cream-50 hover:bg-white/10">
                                ${icon("clock", "size-4")}
                                Lihat ${pendingCount} pending
                            </a>
                        </div>
                    </div>

                    <div class="w-full max-w-xs shrink-0 rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                        <p class="text-[10px] font-semibold tracking-[0.16em] text-coffee-300 uppercase">Ringkasan minggu ini</p>
                        <p class="mt-1.5 font-display text-2xl font-semibold">${rupiah(weeklyRevenue)}</p>
                        <div class="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
                            <span class="text-coffee-300/80">${formatNumber(days.reduce((total, day) => total + day.count, 0))} transaksi</span>
                            <span class="flex items-center gap-1 font-semibold text-sage-300">
                                ${icon("trendingUp", "size-3.5")}
                                7 hari
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                ${statCard({
                    label: "Transaksi hari ini",
                    value: formatNumber(todayCount),
                    hint: `${formatNumber(todayTransactions.filter((trx) => trx.status === "pending").length)} masih pending`,
                    iconName: "receipt",
                    tone: "clay",
                })}
                ${statCard({
                    label: "Omzet hari ini",
                    value: rupiah(todayRevenue),
                    hint: `Rata-rata ${rupiah(average)} / transaksi`,
                    iconName: "coin",
                    tone: "sage",
                })}
                ${statCard({
                    label: "Menunggu pembayaran",
                    value: formatNumber(pendingCount),
                    hint:
                        pendingCount > 0
                            ? "Perlu segera ditindaklanjuti"
                            : "Semua transaksi beres",
                    iconName: "clock",
                    tone: "amber",
                })}
                ${statCard({
                    label: "Pelanggan terdaftar",
                    value: formatNumber(customerTotal),
                    hint: `${formatNumber(menuTotal)} menu aktif`,
                    iconName: "users",
                    tone: "coffee",
                })}
            </div>

            <div class="mt-6 grid gap-5 xl:grid-cols-3">
                <div class="xl:col-span-2">${chartMarkup(days, weeklyRevenue)}</div>
                ${pendingMarkup(transactions)}
            </div>

            <div class="mt-6">${recentMarkup(recent)}</div>
        `;

        page.querySelectorAll("[data-open-trx]").forEach((row) => {
            row.addEventListener("click", () =>
                navigate(`transaksi?id=${row.dataset.openTrx}`),
            );
        });

        page.querySelectorAll("[data-pay-id]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                const trx = transactions.find(
                    (item) =>
                        String(item.id_transaksi) === button.dataset.payId,
                );
                if (!trx) return;
                openPaymentModal(trx, {
                    onSuccess: () => load(),
                });
            });
        });
    };

    await load();
}
