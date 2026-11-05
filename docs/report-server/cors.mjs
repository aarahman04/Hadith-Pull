// Wrap the existing Worker handle; /counts never gains browser CORS access.
export const REPORT_ORIGINS = new Set(['https://hadithpull.online', 'https://www.hadithpull.online']);
export function withReportCors(handle) {
    return async function (request, env, now) {
        const origin = request.headers.get('Origin'), report = new URL(request.url).pathname === '/report';
        if (!origin || !report) return handle(request, env, now);
        if (!REPORT_ORIGINS.has(origin)) return new Response(null, { status: 403, headers: { Vary: 'Origin' } });
        const headers = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
        if (request.method === 'OPTIONS') {
            const method = request.headers.get('Access-Control-Request-Method');
            const requested = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
            if (method !== 'POST' || requested.some(h => h !== 'content-type')) return new Response(null, { status: 403, headers });
            return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
        }
        const response = await handle(request, env, now);
        const wrapped = new Response(response.body, response);
        for (const [key, value] of Object.entries(headers)) wrapped.headers.set(key, value);
        return wrapped;
    };
}
