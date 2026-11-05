/* Offline local-date counterpart of Android SlotPlanner and HijriCalendar. */
(function (root) {
    const DAY = 86400000;
    const months = ['Muharram', 'Safar', "Rabi’ al-Awwal", "Rabi’ al-Akhir", 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha’ban", 'Ramadan', 'Shawwal', "Dhu al-Qa’dah", 'Dhu al-Hijjah'];
    const epoch = date => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
    const fromEpoch = day => { const d = new Date(day * DAY); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12); };
    const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    function hijri(date, adjustment, table) {
        const day = epoch(date) + ([-1, 0, 1].includes(adjustment) ? adjustment : 0);
        if (day < table[0][0] || day >= table.at(-1)[0]) return null;
        let low = 0, high = table.length - 1;
        while (low + 1 < high) { const mid = (low + high) >> 1; if (table[mid][0] <= day) low = mid; else high = mid; }
        return { year: table[low][1], month: table[low][2], day: day - table[low][0] + 1 };
    }
    const forbidden = h => h && ((h.month === 10 && h.day === 1) || (h.month === 12 && h.day >= 10 && h.day <= 13));
    function matches(occasion, date, adjustment, table) {
        const target = fromEpoch(epoch(date) + (occasion.dayOffset === -1 ? 1 : 0)), h = hijri(target, adjustment, table), r = occasion.rule;
        const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const match = r.type === 'weekday' ? r.days.includes(weekdays[target.getDay()]) : h && r.days.includes(h.day) && (r.type === 'hijri' ? h.month === r.month : !(r.exceptMonths || []).includes(h.month));
        if (!match) return false;
        if (!occasion.exclusions.length) return true;
        if (!h) return false;
        return !(occasion.exclusions.includes('ramadan') && h.month === 9) && !(occasion.exclusions.includes('forbidden_fast_days') && forbidden(h));
    }
    function plan(date, settings, occasions, table) {
        const slots = settings.slots.filter(s => s.on).map(s => s.id.toUpperCase()), result = {};
        const candidates = occasions.filter(o => o.enabled && o.hadiths.length && (o.category === 'recurring_fast' ? settings.recurringFastsOn : settings.specialDaysOn) && matches(o, date, settings.hijriAdjustment, table)).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
        for (const occasion of candidates) { const slot = occasion.slots.find(s => slots.includes(s) && !result[s]); if (slot) result[slot] = occasion; }
        for (const slot of slots) result[slot] ||= null;
        return result;
    }
    const escape = text => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
    function pickDaily(candidates, history, today, random = Math.random, extraExcluded = []) {
        if (!candidates.length) return null;
        const excluded = new Set([...history.filter(h => today - h.day < 365).map(h => h.urn), ...extraExcluded]);
        let fallback;
        for (let attempt = 0; attempt < 48; attempt++) {
            const candidate = candidates[Math.floor(random() * candidates.length)];
            if (excluded.has(candidate[0])) continue;
            if (candidate[3]) return candidate;
            fallback ||= candidate;
        }
        if (fallback) return fallback;
        const start = Math.floor(random() * candidates.length), lastSeen = new Map();
        for (const h of history) if (!lastSeen.has(h.urn)) lastSeen.set(h.urn, h.day);
        let least, leastDay = Infinity;
        for (let step = 0; step < candidates.length; step++) {
            const candidate = candidates[(start + step) % candidates.length];
            if (!excluded.has(candidate[0])) return candidate;
            const day = lastSeen.get(candidate[0]) ?? -Infinity;
            if (day < leastDay) { least = candidate; leastDay = day; }
        }
        return least;
    }
    function foldLine(line) {
        const out = []; let part = '', bytes = 0;
        for (const ch of line) { const length = new TextEncoder().encode(ch).length; if (bytes + length > 73) { out.push(part); part = ' '; bytes = 1; } part += ch; bytes += length; }
        out.push(part); return out.join('\r\n');
    }
    function calendar(settings, occasions, table, daily, now = new Date(), days = 366) {
        const ranges = { morning: ['04:00', '11:59'], afternoon: ['12:00', '17:59'], night: ['18:00', '23:59'] };
        if (!Number.isInteger(days) || days < 1 || days > 366 || !Number.isFinite(now.getTime()) || ![-1, 0, 1].includes(settings.hijriAdjustment)) throw Error('Invalid calendar date range or adjustment.');
        if (!settings.slots.some(s => s.on)) throw Error('Choose at least one reminder.');
        if (settings.slots.some(s => !ranges[s.id] || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s.time) || s.time < ranges[s.id][0] || s.time > ranges[s.id][1])) throw Error('Choose a valid time within each reminder period.');
        const pad = n => String(n).padStart(2, '0'), local = (date, time) => key(date).replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
        const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hadith Pull//Occasions//EN', 'CALSCALE:GREGORIAN'];
        const cursors = new Map(), history = [];
        const eligible = daily.filter(d => settings.pool === 'ALL_SAHIH' || ['bukhari', 'muslim'].includes(d[1]));
        const pool = eligible.length ? eligible : daily;
        for (let day = 0; day < days; day++) {
            const date = fromEpoch(epoch(now) + day), planned = plan(date, settings, occasions, table);
            for (const slot of settings.slots.filter(s => s.on)) {
                const occasion = planned[slot.id.toUpperCase()], start = new Date(date); const [hours, minutes] = slot.time.split(':').map(Number); start.setHours(hours, minutes, 0, 0); if (start <= now) continue;
                let urn, title = 'Hadith Pull — ' + slot.id;
                if (occasion) { const index = cursors.get(occasion.id) || 0; urn = occasion.hadiths[index % occasion.hadiths.length].replace('urn:', ''); cursors.set(occasion.id, index + 1); title = occasion.title; }
                else if (pool.length) {
                    const picked = pickDaily(pool, history, epoch(date));
                    urn = picked[0]; history.unshift({ urn, day: epoch(date) });
                }
                const url = urn ? 'https://hadithpull.online/h/?k=urn%3A' + urn : 'https://hadithpull.online/about#daily-saying';
                const guidance = occasion?.sightingDependent ? 'Dates use Umm al-Qura with your adjustment. Confirm local moon sighting; this calendar is not a fasting ruling. ' : '';
                const description = guidance + (occasion?.subtext || 'Take a moment to read and reflect on a Sahih narration.') + '\n' + url;
                const end = new Date(start.getTime() + 5 * 60000);
                lines.push('BEGIN:VEVENT', `UID:hp-${key(date)}-${slot.id}@hadithpull.online`, 'DTSTAMP:' + stamp, 'DTSTART:' + local(start, slot.time), 'DTEND:' + local(end, pad(end.getHours()) + ':' + pad(end.getMinutes())), 'SUMMARY:' + escape(title), 'DESCRIPTION:' + escape(description), 'URL:' + url,
                    'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:' + escape(title), 'END:VALARM', 'END:VEVENT');
            }
        }
        return [...lines, 'END:VCALENDAR', ''].map(foldLine).join('\r\n');
    }
    const api = { epoch, fromEpoch, key, hijri, forbidden, matches, plan, calendar, pickDaily, format: h => h ? `${h.day} ${months[h.month - 1]} ${h.year}` : 'Hijri date outside supported range' };
    if (typeof module !== 'undefined') module.exports = api;
    root.HadithOccasions = api;
})(globalThis);
