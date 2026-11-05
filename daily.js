/* Purposeful in-page widget counterpart. Read-from and reader history are independent. */
const Daily = (() => {
    const { Local } = Parity, { el, button } = Topics, O = HadithOccasions;
    let assetsPromise, dayShown;
    function assets() {
        if (!assetsPromise) assetsPromise = Promise.all(['data/notifications/occasions.json', 'data/notifications/umm-al-qura.json', 'data/daily-sayings.json'].map(url => fetch(url).then(r => { if (!r.ok) throw Error('Daily content unavailable'); return r.json(); }))).catch(e => { assetsPromise = null; throw e; });
        return assetsPromise;
    }
    function settings() {
        return { pool: 'BUKHARI_MUSLIM', specialDaysOn: true, recurringFastsOn: false, hijriAdjustment: 0, ...Local.get('occasionSettings', {}), slots: Local.get('calendarReminders', [
            { id: 'morning', on: true, time: '07:00' }, { id: 'afternoon', on: false, time: '15:00' }, { id: 'night', on: true, time: '21:00' }
        ]) };
    }
    async function paint(force = false) {
        const root = document.getElementById('daily-saying'); if (!root) return;
        const today = new Date(), day = O.key(today); if (!force && dayShown === day) return; dayShown = day;
        root.replaceChildren(el('p', 'loading-state', 'Loading today’s saying…'));
        try {
            const [approved, table, sayings] = await assets(), s = settings(), h = O.hijri(today, s.hijriAdjustment, table);
            let stored = Local.get('dailySaying', {}), quote, urn;
            const friday = today.getDay() === 5 && s.specialDaysOn && approved.occasions.find(o => o.category === 'friday' && o.enabled);
            if (friday) {
                const index = ((Math.trunc(O.epoch(today) / 7) + Math.trunc(friday.hadiths.length / 2)) % friday.hadiths.length + friday.hadiths.length) % friday.hadiths.length;
                const found = await findRecord(friday.hadiths[index]);
                if (found && ['sahih', 'hasan'].includes(found.record.primary?.cat)) { urn = found.record.urn; quote = sayings.find(q => q.urn === urn) || { text: buildExcerpt(found.record.english, { whole: 340, min: 120, cap: 320, worthHiding: 20 }) || found.record.english, narrator: '' }; }
            }
            if (!urn) {
                if (stored.day === day && sayings.some(q => q.urn === stored.urn)) quote = sayings.find(q => q.urn === stored.urn);
                else { const index = ((stored.cursor == null ? O.epoch(today) : stored.cursor + 1) % sayings.length + sayings.length) % sayings.length; quote = sayings[index]; stored = { day, urn: quote.urn, cursor: index }; Local.set('dailySaying', stored); }
                urn = quote.urn;
            }
            const found = await findRecord('urn:' + urn); if (!found) throw Error('Today’s narration could not load.');
            root.replaceChildren(el('span', 'eyebrow', friday ? 'Friday’s saying' : 'Saying of the day'), el('p', 'local-note', O.format(h)), el('blockquote', '', quote.text), el('p', 'local-note', `${found.collection.title} · ${found.record.ref}${quote.narrator ? ' · ' + quote.narrator : ''}`), button('Read with full reference', () => Topics.detail([urn])));
            const planned = O.plan(today, s, approved.occasions, table);
            for (const [slot, occasion] of Object.entries(planned)) if (occasion) root.append(button(`${occasion.title} · ${slot.toLowerCase()}${occasion.dayOffset === -1 ? ' (evening before)' : ''}`, () => Topics.detail(occasion.hadiths.map(k => k.slice(4)))));
            if (Object.values(planned).some(o => o?.sightingDependent)) root.append(el('p', 'local-note', 'Umm al-Qura dates are adjusted by your setting. Confirm local moon sighting; dates are guidance, not a fasting ruling.'));
        } catch { dayShown = null; root.replaceChildren(el('p', '', 'Could not load today’s saying.'), button('Retry', () => paint(true))); }
    }
    const controls = document.getElementById('occasion-controls');
    if (controls) {
        const s = settings();
        for (const id of ['pool', 'specialDaysOn', 'recurringFastsOn', 'hijriAdjustment']) {
            const input = document.getElementById('occasion-' + id); if (input.type === 'checkbox') input.checked = s[id]; else input.value = String(s[id]);
            input.addEventListener('change', () => { const next = settings(); next[id] = input.type === 'checkbox' ? input.checked : id === 'hijriAdjustment' ? Number(input.value) : input.value; delete next.slots; Local.set('occasionSettings', next); paint(true); });
            if (input.tagName === 'SELECT') {
                const label = input.parentElement.firstChild.textContent.trim(), value = el('span');
                const choice = button('', () => openMenu(choice, { title: label, items: [...input.options].map(option => ({
                    label: option.textContent, checked: input.value === option.value,
                    onSelect: () => { input.value = option.value; input.dispatchEvent(new Event('change', { bubbles: true })); }
                })) }), 'occasion-select');
                choice.append(value, Topics.mark('next')); choice.setAttribute('aria-haspopup', 'menu');
                const sync = () => { value.textContent = input.selectedOptions[0].textContent; choice.setAttribute('aria-label', label + ': ' + value.textContent); };
                input.addEventListener('change', sync); sync(); input.hidden = true; input.after(choice);
            }

        }
        document.getElementById('occasion-export').addEventListener('click', async e => {
            const b = e.currentTarget, status = document.getElementById('occasion-status'); b.disabled = true;
            try {
                const s = settings();
                s.slots = s.slots.map(slot => ({ id: slot.id, on: document.getElementById(`reminder-${slot.id}-on`)?.checked ?? slot.on, time: document.getElementById(`reminder-${slot.id}-time`)?.value ?? slot.time }));
                if (!s.slots.some(x => x.on)) throw Error('Choose at least one reminder slot.');
                const [approved, table] = await assets(), pools = await loadReadingPools();
                const ics = O.calendar(s, approved.occasions, table, pools.daily);
                Local.set('calendarReminders', s.slots);
                downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'hadith-pull-year.ics');
                status.textContent = 'One year of local-time reminders exported. Import once; delete the earlier Hadith Pull calendar before importing a replacement. Confirm your calendar’s alert and time-zone settings.';
            } catch (error) { status.textContent = error.message; } finally { b.disabled = false; }
        });
    }
    document.addEventListener('screenchange', e => { if (e.detail === 'about') paint(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
    setInterval(() => paint(), 60000);
    if (location.pathname.replace(/\.html$/, '').endsWith('/about')) paint();
    return { paint, assets, settings };
})();
