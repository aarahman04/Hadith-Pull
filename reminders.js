const REMINDER_SLOTS = [
    { id: 'morning', label: 'Morning', time: '07:00', on: true, min: '04:00', max: '11:59' },
    { id: 'afternoon', label: 'Afternoon', time: '15:00', on: false, min: '12:00', max: '17:59' },
    { id: 'night', label: 'Night', time: '21:00', on: true, min: '18:00', max: '23:59' }
];

/** Floating local times keep daily reminders at the chosen hour across daylight-saving changes. */
function reminderCalendar(slots, now = new Date()) {
    if (!slots.length) throw new Error('Choose at least one reminder.');
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const localDate = date => {
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hadith Pull//Reminders//EN', 'CALSCALE:GREGORIAN'];
    for (const slot of slots) {
        const rule = REMINDER_SLOTS.find(s => s.id === slot.id);
        if (!rule || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time) || slot.time < rule.min || slot.time > rule.max) {
            throw new Error('Choose a valid time within each reminder period.');
        }
        const start = new Date(now);
        const [hour, minute] = slot.time.split(':').map(Number);
        start.setHours(hour, minute, 0, 0);
        if (start <= now) start.setDate(start.getDate() + 1);
        lines.push('BEGIN:VEVENT', `UID:hadith-pull-${slot.id}@hadithpull.online`, `DTSTAMP:${stamp}`,
            `DTSTART:${localDate(start)}`, `DTEND:${localDate(new Date(start.getTime() + 5 * 60000))}`,
            'RRULE:FREQ=DAILY', `SUMMARY:Hadith Pull - ${rule.label}`,
            'DESCRIPTION:Take a moment to read and reflect on a Hadith.', 'URL:https://hadithpull.online/',
            'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:Time for a Hadith',
            'END:VALARM', 'END:VEVENT');
    }
    return [...lines, 'END:VCALENDAR', ''].join('\r\n');
}

const reminderForm = document.getElementById('reminder-form');
if (reminderForm) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('calendarReminders')); } catch { /* Keep defaults. */ }
    for (const slot of REMINDER_SLOTS) {
        const input = document.getElementById(`reminder-${slot.id}-time`);
        input.addEventListener('click', event => {
            if (typeof input.showPicker !== 'function') return;
            try {
                input.showPicker();
                // The segment's default click would immediately close the picker again.
                event.preventDefault();
            } catch { /* Keep native editing if the picker is unavailable. */ }
        });
        const value = Array.isArray(saved) && saved.find(s => s.id === slot.id);
        if (value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time) && value.time >= slot.min && value.time <= slot.max) {
            document.getElementById(`reminder-${slot.id}-on`).checked = Boolean(value.on);
            input.value = value.time;
        }
    }
    reminderForm.addEventListener('submit', event => {
        event.preventDefault();
        const status = document.getElementById('reminder-status');
        const slots = REMINDER_SLOTS.map(slot => ({ id: slot.id,
            on: document.getElementById(`reminder-${slot.id}-on`).checked,
            time: document.getElementById(`reminder-${slot.id}-time`).value }));
        try {
            const calendar = reminderCalendar(slots.filter(s => s.on));
            localStorage.setItem('calendarReminders', JSON.stringify(slots));
            downloadBlob(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }), 'hadith-pull-reminders.ics');
            status.textContent = 'Calendar file ready. Import it in your calendar app to turn on reminders.';
        } catch (error) {
            status.textContent = error.message;
        }
    });
}
