const BASE = '/api/v1';
const TOKEN_KEY = 'titiktemu.token';
const USER_KEY = 'titiktemu.user';

export class ApiError extends Error {
    constructor(message, status = 0, errors = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors || {};
    }

    get firstError() {
        const first = Object.values(this.errors)[0];
        return Array.isArray(first) ? first[0] : null;
    }
}

export const session = {
    get token() {
        return localStorage.getItem(TOKEN_KEY) || '';
    },

    get user() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        } catch {
            return null;
        }
    },

    set(auth) {
        if (auth?.token) localStorage.setItem(TOKEN_KEY, auth.token);
        if (auth?.user) localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    },

    setUser(user) {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};

const buildUrl = (path, query) => {
    const url = new URL(`${BASE}/${String(path).replace(/^\/+/, '')}`, window.location.origin);

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
};

export async function request(path, { method = 'GET', body, query, headers = {}, skipAuthRedirect = false } = {}) {
    const finalHeaders = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...headers,
    };

    if (session.token) {
        finalHeaders.Authorization = `Bearer ${session.token}`;
    }

    if (body !== undefined) {
        finalHeaders['Content-Type'] = 'application/json';
    }

    let response;

    try {
        response = await fetch(buildUrl(path, query), {
            method,
            headers: finalHeaders,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0);
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
        if (response.status === 401 && !skipAuthRedirect) {
            session.clear();
            window.dispatchEvent(new CustomEvent('auth:expired'));
        }

        throw new ApiError(
            payload?.message || (response.status === 403
                ? 'Anda tidak memiliki akses untuk tindakan ini.'
                : 'Terjadi kesalahan. Silakan coba lagi.'),
            response.status,
            payload?.errors || {},
        );
    }

    return payload;
}

export const api = {
    get: (path, query, options = {}) => request(path, { ...options, query }),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
};

export const authApi = {
    async login(email, password) {
        const response = await api.post('auth/login', { email, password }, { skipAuthRedirect: true });
        session.set(response.data);
        return response.data;
    },

    async me() {
        const response = await api.get('auth/me');
        const user = response.data;
        session.setUser(user);
        return user;
    },

    async logout() {
        try {
            await api.post('auth/logout');
        } finally {
            session.clear();
        }
    },
};
