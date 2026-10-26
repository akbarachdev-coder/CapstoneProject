import { authApi, session } from './lib/api.js';
import { confirmModal, pageSkeleton, toast } from './lib/ui.js';
import { mountShell } from './layout.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderPos } from './pages/pos.js';
import { renderTransaksi } from './pages/transaksi.js';
import { renderMenu } from './pages/menu.js';
import { renderPelanggan } from './pages/pelanggan.js';
import { renderReservasi } from './pages/reservasi.js';
import { renderLaporan } from './pages/laporan.js';
import { renderKasir } from './pages/kasir.js';

const appRoot = document.getElementById('app');
const bootScreen = document.getElementById('boot');

const routes = {
    dashboard: { title: 'Ringkasan', render: renderDashboard },
    'transaksi-baru': { title: 'Kasir / POS', render: renderPos },
    transaksi: { title: 'Transaksi', render: renderTransaksi },
    menu: { title: 'Menu', render: renderMenu },
    pelanggan: { title: 'Pelanggan', render: renderPelanggan },
    reservasi: { title: 'Reservasi', render: renderReservasi },
    laporan: { title: 'Laporan', render: renderLaporan, adminOnly: true },
    kasir: { title: 'Kelola Kasir', render: renderKasir, adminOnly: true },
};

let currentUser = null;
let shell = null;
let routeController = null;
let shellController = null;
let bootHidden = false;

const clearOverlays = () => {
    document.querySelectorAll('[data-modal-backdrop]').forEach((overlay) => overlay.remove());
    document.body.style.overflow = '';
};

const hideBoot = () => {
    if (bootHidden || !bootScreen) return;
    bootHidden = true;
    bootScreen.style.opacity = '0';
    setTimeout(() => bootScreen.remove(), 350);
};

const navigate = (path, { replace = false } = {}) => {
    const target = `#/${String(path).replace(/^\/+/, '')}`;
    if (location.hash === target) {
        route();
        return;
    }

    if (replace) {
        history.replaceState(null, '', target);
        route();
    } else {
        location.hash = target;
    }
};

const renderRoute = async () => {
    if (!currentUser || !shell) return;

    const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [pathPart, queryString = ''] = raw.split('?');
    const path = pathPart.split('/')[0] || 'dashboard';
    let route = routes[path];

    if (!route) {
        navigate('dashboard', { replace: true });
        return;
    }

    if (route.adminOnly && currentUser.role !== 'admin') {
        toast('Halaman ini hanya tersedia untuk administrator.', 'warning', 'Akses terbatas');
        navigate('dashboard', { replace: true });
        return;
    }

    routeController?.abort();
    routeController = new AbortController();

    shell.setActive(path === 'transaksi-baru' ? 'pos' : path);
    shell.setCrumb(route.title);
    document.title = `${route.title} · Titik Temu`;
    shell.page.innerHTML = pageSkeleton();

    const context = {
        user: currentUser,
        query: new URLSearchParams(queryString),
        signal: routeController.signal,
        page: shell.page,
        navigate,
        setCrumb: shell.setCrumb,
        refreshUser: async () => {
            currentUser = await authApi.me();
            return currentUser;
        },
    };

    try {
        await route.render(context);
    } catch (error) {
        if (error?.name === 'AbortError' || context.signal.aborted) return;
        shell.page.innerHTML = `
            <div class="card card-pad">
                <div class="empty-state">
                    <div class="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-6"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
                    </div>
                    <p class="font-display text-lg font-semibold text-coffee-800">Halaman gagal dimuat</p>
                    <p class="max-w-md text-sm text-coffee-400">${error?.message || 'Silakan coba lagi.'}</p>
                    <button type="button" class="btn-secondary btn-sm" onclick="location.reload()">Muat ulang</button>
                </div>
            </div>
        `;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
};

const route = () => {
    renderRoute();
};

const showLogin = () => {
    routeController?.abort();
    shellController?.abort();
    routeController = null;
    shellController = null;
    shell = null;
    currentUser = null;
    clearOverlays();
    appRoot.innerHTML = '';
    renderLogin(appRoot, {
        onSuccess: (user) => startApp(user),
    });
    document.title = 'Masuk · Titik Temu';
    hideBoot();
};

const startApp = (user) => {
    currentUser = user;
    appRoot.innerHTML = '';
    routeController?.abort();
    shellController?.abort();
    clearOverlays();

    shellController = new AbortController();
    shell = mountShell(appRoot, user, {
        onLogout: handleLogout,
        signal: shellController.signal,
    });

    hideBoot();

    if (!location.hash.startsWith('#/')) {
        history.replaceState(null, '', '#/dashboard');
    }

    route();
};

const handleLogout = async () => {
    const confirmed = await confirmModal({
        title: 'Keluar dari aplikasi?',
        message: 'Sesi Anda akan diakhiri. Anda perlu masuk kembali untuk melanjutkan pencatatan transaksi.',
        confirmText: 'Ya, keluar',
        cancelText: 'Tetap di sini',
        iconName: 'logout',
    });

    if (!confirmed) return;

    try {
        await authApi.logout();
    } catch {
        session.clear();
    }

    showLogin();
    toast('Anda telah keluar dengan aman.', 'info', 'Sampai jumpa');
};

window.addEventListener('hashchange', route);

window.addEventListener('auth:expired', () => {
    if (!currentUser) return;
    showLogin();
    toast('Sesi Anda telah berakhir. Silakan masuk kembali.', 'warning', 'Sesi berakhir');
});

const boot = async () => {
    if (!session.token) {
        showLogin();
        return;
    }

    try {
        const user = await authApi.me();
        startApp(user);
    } catch {
        session.clear();
        showLogin();
    }
};

boot();
