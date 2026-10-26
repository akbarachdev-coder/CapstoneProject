import { icon } from './lib/icons.js';
import { escapeHtml, formatDateLong, initials } from './lib/format.js';

export const NAV_GROUPS = [
    {
        label: 'Operasional',
        items: [
            { key: 'dashboard', path: 'dashboard', label: 'Ringkasan', icon: 'dashboard' },
            { key: 'pos', path: 'transaksi-baru', label: 'Catat Pesanan', icon: 'cup', roles: ['kasir'] },
            { key: 'transaksi', path: 'transaksi', label: 'Riwayat Transaksi', icon: 'receipt', roles: ['admin', 'kasir'] },
        ],
    },
    {
        label: 'Manajemen',
        items: [
            { key: 'menu', path: 'menu', label: 'Daftar Menu', icon: 'bag', roles: ['admin', 'kasir'] },
            { key: 'laporan-penjualan', path: 'laporan-penjualan', label: 'Laporan Penjualan', icon: 'chart', roles: ['admin'] },
            { key: 'laporan-pendapatan', path: 'laporan-pendapatan', label: 'Laporan Pendapatan', icon: 'coin', roles: ['admin'] },
            { key: 'kasir', path: 'kasir', label: 'Kelola Pengguna', icon: 'users', roles: ['admin'] },
        ],
    },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const canSee = (item, user) => !item.roles || item.roles.includes(user.role);

const roleLabel = (role) => (role === 'admin' ? 'Administrator' : 'Kasir');

const brandMark = `
    <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream-50 text-coffee-900 shadow-md shadow-black/20">
        ${icon('cup', 'size-5.5')}
    </span>
    <span class="min-w-0">
        <span class="block truncate font-display text-lg font-semibold leading-tight tracking-tight text-cream-50">Titik Temu</span>
        <span class="block text-[9px] font-semibold tracking-[0.22em] text-coffee-300 uppercase">Coffee &amp; Eatery</span>
    </span>
`;

const navMarkup = (user, currentPath) => NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => canSee(item, user));
    if (!items.length) return '';

    return `
        <div class="mb-6">
            <p class="mb-2 px-3.5 text-[10px] font-bold tracking-[0.18em] text-coffee-400/70 uppercase">${group.label}</p>
            <nav class="space-y-1">
                ${items.map((item) => `
                    <a href="#/${item.path}" data-nav-key="${item.key}" class="nav-link group ${currentPath === item.path ? 'nav-link-active' : ''}">
                        <span class="nav-icon">${icon(item.icon, 'size-4.5')}</span>
                        <span>${item.label}</span>
                        ${item.key === 'pos' ? '<span class="nav-badge">Baru</span>' : ''}
                    </a>
                `).join('')}
            </nav>
        </div>
    `;
}).join('');

const userCard = (user) => `
    <div class="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
        <div class="flex items-center gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-clay-500 text-xs font-bold text-white">
                ${escapeHtml(initials(user.name))}
            </span>
            <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-cream-50">${escapeHtml(user.name)}</p>
                <p class="text-[10px] font-medium tracking-wide text-coffee-300/80 uppercase">${roleLabel(user.role)}</p>
            </div>
            <button type="button" data-logout class="flex size-8 items-center justify-center rounded-lg text-coffee-300 transition hover:bg-white/10 hover:text-cream-50" aria-label="Keluar" title="Keluar">
                ${icon('logout', 'size-4')}
            </button>
        </div>
    </div>
`;

export function mountShell(root, user, { onLogout, signal } = {}) {
    const currentPath = window.location.hash.replace(/^#\//, '').split('?')[0] || 'dashboard';

    root.innerHTML = `
        <div class="min-h-screen lg:flex">
            <aside class="sticky top-0 hidden h-screen w-[276px] shrink-0 flex-col overflow-hidden bg-coffee-950 px-4 py-5 text-cream-50 lg:flex">
                <div class="pointer-events-none absolute inset-0 bg-grain opacity-40"></div>
                <div class="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-clay-500/15 blur-3xl"></div>

                <a href="#/dashboard" class="relative z-10 mb-8 flex items-center gap-3 px-1.5">
                    ${brandMark}
                </a>

                <div class="relative z-10 flex-1 overflow-y-auto pr-1 scrollbar-none">
                    ${navMarkup(user, currentPath)}
                </div>

                <div class="relative z-10 mt-5 space-y-3 border-t border-white/10 pt-4">
                    <div class="flex items-center justify-between rounded-xl bg-sage-500/10 px-3 py-2.5 text-[11px]">
                        <span class="flex items-center gap-2 font-medium text-sage-200">
                            <span class="size-1.5 rounded-full bg-sage-400"></span>
                            Outlet aktif
                        </span>
                        <span class="text-coffee-300/70">Titik Temu</span>
                    </div>
                    ${userCard(user)}
                </div>
            </aside>

            <div class="flex min-h-screen min-w-0 flex-1 flex-col">
                <header class="no-print sticky top-0 z-30 border-b border-coffee-200/60 bg-cream-100/80 backdrop-blur-xl">
                    <div class="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
                        <button type="button" id="open-sidebar" class="icon-btn lg:hidden" aria-label="Buka menu">${icon('menu', 'size-5')}</button>

                        <div class="min-w-0">
                            <p class="hidden text-[10px] font-semibold tracking-[0.16em] text-coffee-400 uppercase sm:block">Café Titik Temu</p>
                            <p id="crumb-title" class="truncate font-display text-base font-semibold text-coffee-900 sm:text-lg">Ringkasan</p>
                        </div>

                        <div class="ml-auto flex items-center gap-2 sm:gap-3">
                            <div class="hidden items-center gap-2 rounded-xl border border-coffee-200/70 bg-white/60 px-3 py-2 text-xs text-coffee-500 md:flex">
                                ${icon('sun', 'size-4 text-clay-500')}
                                <span>${escapeHtml(formatDateLong(new Date()))}</span>
                            </div>

                            <span class="hidden items-center gap-1.5 rounded-full border border-sage-200 bg-sage-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-sage-700 uppercase sm:inline-flex">
                                <span class="size-1.5 rounded-full bg-sage-500"></span>
                                Buka
                            </span>

                            <div class="relative">
                                <button type="button" id="user-menu-button" class="flex items-center gap-2 rounded-xl border border-transparent p-1 pr-2 transition hover:border-coffee-200 hover:bg-white/70" aria-haspopup="true" aria-expanded="false">
                                    <span class="flex size-8 items-center justify-center rounded-full bg-coffee-800 text-[10px] font-bold text-cream-50">
                                        ${escapeHtml(initials(user.name))}
                                    </span>
                                    <span class="hidden max-w-32 truncate text-xs font-semibold text-coffee-800 sm:block">${escapeHtml(user.name)}</span>
                                    <span class="hidden text-coffee-400 sm:block">${icon('chevronDown', 'size-3.5')}</span>
                                </button>

                                <div id="user-menu" class="absolute right-0 mt-2 hidden w-64 overflow-hidden rounded-2xl border border-coffee-200/80 bg-cream-50 shadow-lift">
                                    <div class="border-b border-coffee-200/70 px-4 py-3.5">
                                        <p class="text-sm font-semibold text-coffee-900">${escapeHtml(user.name)}</p>
                                        <p class="mt-0.5 truncate text-xs text-coffee-400">${escapeHtml(user.email)}</p>
                                        <span class="badge-neutral mt-2">${roleLabel(user.role)}</span>
                                    </div>
                                    <div class="p-1.5">
                                        <button type="button" data-logout class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-coffee-600 transition hover:bg-rose-50 hover:text-rose-600">
                                            ${icon('logout', 'size-4')}
                                            Keluar dari akun
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main id="app-main" class="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                    <div id="page"></div>
                </main>

                <footer class="no-print mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3 px-4 pb-5 text-[10px] text-coffee-400 sm:px-6 lg:px-8">
                    <p>© ${new Date().getFullYear()} Café Titik Temu</p>
                    <p class="flex items-center gap-1.5">
                        ${icon('shield', 'size-3')}
                        Data transaksi tersimpan aman
                    </p>
                </footer>
            </div>
        </div>

        <div id="mobile-sidebar" class="no-print fixed inset-0 z-50 hidden lg:hidden">
            <div class="absolute inset-0 bg-coffee-950/50 backdrop-blur-[2px]" data-close-sidebar></div>
            <div class="relative flex h-full w-[286px] max-w-[86vw] flex-col overflow-hidden bg-coffee-950 px-4 py-5 text-cream-50 shadow-2xl">
                <div class="pointer-events-none absolute inset-0 bg-grain opacity-40"></div>
                <div class="relative z-10 mb-6 flex items-center justify-between">
                    <a href="#/dashboard" class="flex items-center gap-3">${brandMark}</a>
                    <button type="button" data-close-sidebar class="flex size-9 items-center justify-center rounded-lg text-coffee-300 transition hover:bg-white/10 hover:text-cream-50" aria-label="Tutup menu">
                        ${icon('x', 'size-5')}
                    </button>
                </div>
                <div class="relative z-10 flex-1 overflow-y-auto scrollbar-none">
                    ${navMarkup(user, currentPath)}
                </div>
                <div class="relative z-10 mt-4 border-t border-white/10 pt-4">
                    ${userCard(user)}
                </div>
            </div>
        </div>
    `;

    const crumb = root.querySelector('#crumb-title');
    const userMenu = root.querySelector('#user-menu');
    const userButton = root.querySelector('#user-menu-button');
    const mobileSidebar = root.querySelector('#mobile-sidebar');

    const closeSidebar = () => {
        mobileSidebar.classList.add('hidden');
        document.body.style.overflow = '';
    };

    const openSidebar = () => {
        mobileSidebar.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    root.querySelector('#open-sidebar')?.addEventListener('click', openSidebar);
    root.querySelectorAll('[data-close-sidebar]').forEach((el) => el.addEventListener('click', closeSidebar));
    mobileSidebar.querySelectorAll('a[href^="#/"]').forEach((el) => el.addEventListener('click', closeSidebar));

    userButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = userMenu.classList.contains('hidden');
        userMenu.classList.toggle('hidden');
        userButton.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (event) => {
        if (!userMenu?.contains(event.target) && !userButton?.contains(event.target)) {
            userMenu?.classList.add('hidden');
            userButton?.setAttribute('aria-expanded', 'false');
        }
    }, { signal });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeSidebar();
    }, { signal });

    root.querySelectorAll('[data-logout]').forEach((button) => {
        button.addEventListener('click', () => onLogout?.());
    });

    const setActive = (key) => {
        root.querySelectorAll('[data-nav-key]').forEach((link) => {
            link.classList.toggle('nav-link-active', link.dataset.navKey === key);
        });

        const item = NAV_ITEMS.find((nav) => nav.key === key);
        if (item) crumb.textContent = item.label;
    };

    return {
        page: root.querySelector('#page'),
        setActive,
        setCrumb: (text) => {
            crumb.textContent = text;
        },
        closeSidebar,
    };
}
