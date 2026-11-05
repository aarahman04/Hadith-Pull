/* Set only after the documented allowlisted CORS patch is deployed and verified. */
const REPORT_ENDPOINT = null;
(function (root) {
    const DAY = 86400000;
    class Reports {
        constructor(store, { endpoint = REPORT_ENDPOINT, send = (...args) => fetch(...args), now = () => Date.now(), uuid = () => crypto.randomUUID() } = {}) {
            this.store = store; this.endpoint = endpoint; this.send = send; this.now = now; this.uuid = uuid; this.running = false;
        }
        read() { const d = this.store.get('topicReports', {}); return { install: d.install, reports: Array.isArray(d.reports) ? d.reports : [] }; }
        status(urn, topic) {
            const r = this.read().reports.find(r => r.urn === urn && r.topic === topic);
            if (!r) return null;
            return { queued: 'Reported · thank you', sent: 'Reported · thank you', rejected: 'Report declined', expired: 'Report expired' }[r.state];
        }
        async enqueue(urn, topic, reason = '') {
            if (!/^[1-9]\d{0,8}$/.test(urn) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic) || !['', 'not-about', 'passing', 'other'].includes(reason)) throw Error('Invalid report');
            if (this.status(urn, topic)) return this.status(urn, topic);
            const data = this.read(); data.install ||= this.uuid();
            if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(data.install)) throw Error('Invalid installation ID');
            data.reports.push({ urn, topic, reason, created: this.now(), next: this.now(), tries: 0, state: 'queued' });
            if (!this.store.set('topicReports', data)) {
                data.reports.pop(); this.store.set('topicReports', data);
                return 'Could not queue: browser storage is unavailable';
            }
            await this.flush(); return this.status(urn, topic);
        }
        async flush() {
            if (this.running) return; this.running = true;
            try {
                const data = this.read();
                for (const report of data.reports) {
                    if (report.state !== 'queued') continue;
                    if (this.now() - report.created >= 30 * DAY) { report.state = 'expired'; continue; }
                    if (!this.endpoint || report.next > this.now()) continue;
                    let status = 0;
                    try {
                        const response = await this.send(this.endpoint + '/report', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ install: data.install, urn: report.urn, topic: report.topic, reason: report.reason, app: 'web-20261105' }), signal: AbortSignal.timeout(15000) });
                        status = response.status;
                    } catch { /* A browser CORS/network failure remains queued, never treated as delivered. */ }
                    if (status >= 200 && status < 300) report.state = 'sent';
                    else if (status && status !== 408 && status !== 429 && status < 500) report.state = 'rejected';
                    else { report.tries++; report.next = this.now() + Math.min(DAY, 60000 * 2 ** Math.min(report.tries - 1, 11)); }
                }
                // Merge reports added while a network request was outstanding.
                const latest = this.read();
                for (const report of latest.reports) if (!data.reports.some(r => r.urn === report.urn && r.topic === report.topic)) data.reports.push(report);
                this.store.set('topicReports', data);
            } finally { this.running = false; }
        }
    }
    root.HadithReports = { Reports };
    if (typeof module !== 'undefined') module.exports = { Reports };
})(globalThis);
const ReportQueue = typeof Parity !== 'undefined' ? new HadithReports.Reports(Parity.Local) : null;
if (typeof window !== 'undefined' && ReportQueue) {
    window.addEventListener('online', () => ReportQueue.flush());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ReportQueue.flush(); });
    setInterval(() => ReportQueue.flush(), 60000);
    ReportQueue.flush();
}
