# Browser report delivery: external deployment remains

The inspected Android reference config points at `https://hadithpull-reports.aarahman803.workers.dev`.
Its `server/reports/src/index.js` accepts exactly install/urn/topic/reason/app and has no CORS/OPTIONS handling.
No production reports were sent and no server files were changed or deployed.

`cors.mjs` is a reviewable minimal wrapper, tested with mock handlers in the website suite.
Copy it beside the server index, import `withReportCors`, and change only the default export:

```js
import { withReportCors } from './cors.mjs';
export default { fetch: withReportCors(handle) };
```

It allowlists the two production website origins, handles only report preflights, includes CORS headers on permanent/transient error responses, and keeps `/counts` without CORS.
Native requests without Origin retain their behavior. No credentials or admin token are exposed.
After a separately authorized deployment, verify an allowed browser preflight and a user-authorized real report.
Only then set `REPORT_ENDPOINT` in `reports.js` to that origin and bump the website release version.
Until then, reports are explicitly queued locally, expire after 30 days and are never shown as sent.
While open, the site retries due transient failures every minute, on online and on reopening/visibility; a closed browser cannot promise delivery.
