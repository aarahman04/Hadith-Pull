import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function reader(reduced = false) {
    const elements = new Map();
    const timers = new Map();
    for (const id of ['quote-art', 'generate-btn', 'recent-read', 'dock', 'hadith-card', 'hadith-content', 'arabic-block', 'expand-btn', 'script-bar', 'metadata', 'narration']) {
        const classes = new Set();
        const element = {
            hidden: ['arabic-block', 'metadata'].includes(id), style: {}, naturalHeight: id === 'arabic-block' ? 240 : 100,
            classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name), add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
            setAttribute() {}, scrollTop: id === 'narration' ? 100 : 0,
            getBoundingClientRect() { return { height: this.hidden ? 0 : this.height ?? this.naturalHeight, top: 0 }; },
            get scrollHeight() { return this.naturalHeight; },
            animate(frames, options) {
                const animation = { frames, options, cancelled: false,
                    cancel() {
                        this.cancelled = true;
                        if (element.animation === this) {
                            element.height = element.spacing = undefined;
                            element.animation = null;
                        }
                    } };
                this.animation = animation;
                return animation;
            }
        };
        elements.set(id, element);
    }
    const scrolls = [];
    const context = vm.createContext({
        document: { getElementById: id => elements.get(id), addEventListener() {} }, navigator: {}, addEventListener() {}, URLSearchParams,
        matchMedia: () => ({ matches: reduced }), scrolls,
        setTimeout: callback => { const id = {}; timers.set(id, callback); return id; },
        clearTimeout: id => timers.delete(id),
        getComputedStyle: element => element.spacing || { marginBottom: '27px', paddingBottom: '26px', borderBottomWidth: '1px', opacity: '1', transform: 'none' }
    });
    context.window = context;
    vm.runInContext(readFileSync(new URL('../script.js', import.meta.url), 'utf8'), context);
    vm.runInContext(`current = { excerpt: 'Short translation', arabic: 'Arabic text long enough to show' };
        paintEnglish = expanded => { contentDiv.naturalHeight = expanded ? 360 : 100; };
        updateExpandLabel = () => {};
        scrollNarrationTo = top => scrolls.push(top);`, context);
    return { elements, scrolls, timers, run: code => vm.runInContext(code, context) };
}

test('Recently read waits for an in-flight display so its list cannot include the new current narration', () => {
    const { elements, run } = reader();
    run('setLoading(true)'); assert.equal(elements.get('recent-read').disabled, true);
    run('setLoading(false)'); assert.equal(elements.get('recent-read').disabled, false);
});

test('sheet dismissal preserves horizontal paging and vertically scrolled narration content', () => {
    const { run } = reader();
    run(`let listeners = {}, dismissed = 0, sheetScroll = 0;
        let panel = { scrollTop: 0, style: {}, addEventListener: (name, action) => listeners[name] = action };
        let sheet = { querySelector: name => name === '.modal-panel' ? panel : { offsetParent: {} } };
        closeSheet = () => dismissed++;
        enableSwipeToClose(sheet);
        function touch(name, x, y) { listeners[name]({ target: { closest: () => ({ scrollTop: sheetScroll }) }, touches: [{ clientX: x, clientY: y }], preventDefault() {} }); }
        touch('touchstart', 0, 0); touch('touchmove', 110, 30); touch('touchend', 110, 30);`);
    assert.equal(run('dismissed'), 0, 'a horizontal page gesture stays in the sheet');
    run("sheetScroll = 90; touch('touchstart', 0, 0); touch('touchmove', 0, 130); touch('touchend', 0, 130)");
    assert.equal(run('dismissed'), 0, 'scrolling the body does not dismiss it');
    run("sheetScroll = 0; touch('touchstart', 0, 0); touch('touchmove', 0, 130); touch('touchend', 0, 130)");
    assert.equal(run('dismissed'), 1, 'a downward drag from the top still dismisses');
});

test('hidden reader preloads and superseded shared identities never enter Recently read', () => {
    const { run } = reader();
    run(`let recorded = [], visible = false;
        Parity = { Local: { get: () => recorded, set: (_, value) => { recorded = value; } }, historyAfterDisplay: (list, key) => [key, ...list.filter(k => k !== key)] };
        SiteNavigation = { isReading: () => visible };
        location = { search: '?h=urn:10' }; current = { key: 'urn:10' };`);
    run('recordReadingHistory()'); assert.equal(run('recorded.length'), 0, 'prefetch while another screen is visible');
    run("visible = true; location.search = '?h=urn:20'; recordReadingHistory()"); assert.equal(run('recorded.length'), 0, 'old content before a different shared identity loads');
    run("location.search = '?h=urn:10'; isFetching = true; recordReadingHistory()"); assert.equal(run('recorded.length'), 0, 'in-flight requests');
    run('isFetching = false; recordReadingHistory()'); assert.equal(run('recorded[0]'), 'urn:10');
    run('recordReadingHistory()'); assert.equal(run('recorded.length'), 1, 'the visible identity stays deduplicated');
});

test('collapse animates Arabic spacing to zero and safely reverses or resets an unfinished animation', () => {
    const { elements, scrolls, run } = reader();
    const arabic = elements.get('arabic-block'), english = elements.get('hadith-content');
    run('toggleExpand()');
    const opening = arabic.animation;
    assert.equal(opening.frames[0].height, '0px');
    assert.equal(opening.frames[1].height, '240px');
    assert.equal(opening.options.duration, 750);
    assert.equal(english.animation.frames[1].height, '360px');

    arabic.height = 120;
    arabic.spacing = { marginBottom: '13.5px', paddingBottom: '13px', borderBottomWidth: '0.5px' };
    english.height = 240;
    run('toggleExpand()');
    const closing = arabic.animation;
    assert.equal(opening.cancelled, true);
    assert.equal(closing.frames[0].height, '120px');
    assert.equal(closing.frames[0].paddingBottom, '13px');
    for (const value of Object.values(closing.frames[1])) assert.equal(value, '0px');
    assert.equal(english.animation.frames[0].height, '240px');
    assert.equal(english.animation.frames[1].height, '100px');
    assert.equal(arabic.hidden, false, 'the block remains until its entire box finishes collapsing');
    closing.onfinish();
    assert.equal(arabic.hidden, true);

    run('toggleExpand()');
    const reopened = arabic.animation;
    closing.onfinish();
    assert.equal(arabic.hidden, false, 'an old finish callback cannot hide a reopened narration');
    run('resetClamp()');
    assert.equal(reopened.cancelled, true);
    assert.equal(arabic.hidden, true);
    assert.ok(scrolls.every(top => top === 0));
});

test('reduced motion makes expansion and collapse immediate', () => {
    const { elements, run } = reader(true);
    run('toggleExpand()');
    const arabic = elements.get('arabic-block');
    const reference = elements.get('metadata');
    assert.equal(arabic.animation.options.duration, 0);
    assert.equal(reference.animation.options.duration, 0);
    arabic.animation.onfinish();
    reference.animation.onfinish();
    run('toggleExpand()');
    assert.equal(arabic.animation.options.duration, 0);
    assert.equal(reference.animation.options.duration, 0);
    arabic.animation.onfinish();
    reference.animation.onfinish();
    assert.equal(arabic.hidden, true);
    assert.equal(reference.hidden, true);
});

test('the reference fades before hiding and reverses without a stale callback hiding it', () => {
    const { elements, run } = reader();
    const reference = elements.get('metadata');
    run('toggleExpand()');
    const opening = reference.animation;
    assert.ok(opening, 'the reference participates in the expansion animation');
    assert.equal(opening.frames[0].opacity, '0');
    assert.equal(opening.frames[1].opacity, '1');
    run('toggleExpand()');
    const closing = reference.animation;
    assert.equal(opening.cancelled, true);
    assert.equal(closing.frames[1].opacity, '0');
    assert.equal(closing.frames[1].transform, 'translateY(-16px)');
    assert.equal(closing.options.duration, 750);
    assert.equal(reference.hidden, false, 'closing keeps the reference rendered until the fade ends');
    run('toggleExpand()');
    const reopened = reference.animation;
    closing.onfinish();
    assert.equal(reference.hidden, false);
    run('resetClamp()');
    assert.equal(reopened.cancelled, true);
    reopened.onfinish();
    assert.equal(reference.hidden, true);
});

test('New Hadith fades the complete article before clearing an expanded reference', () => {
    const { elements, timers, run } = reader();
    run('toggleExpand(); hasLoadedOnce = true; setLoading(true)');
    assert.ok(elements.get('hadith-card').classList.contains('fade-out'), 'the parent fade includes every reference animation');
    assert.equal(elements.get('metadata').hidden, false);
    const referenceAnimation = elements.get('metadata').animation;
    [...timers.values()][0]();
    assert.equal(elements.get('metadata').hidden, true);
    assert.equal(referenceAnimation.cancelled, true);
});

test('a completed or failed draw clears its exit fade before the loading timer fires', () => {
    const { elements, timers, run } = reader();
    run('hasLoadedOnce = true; setLoading(true); setLoading(false)');
    assert.equal(elements.get('hadith-card').classList.contains('fade-out'), false);
    assert.equal(timers.size, 0, 'a stale loading timer cannot replace the resulting narration or error');
});


test('the decorative quotation restarts its entrance with every narration', () => {
    const { elements, run } = reader();
    for (let n = 0; n < 2; n++) {
        elements.get('quote-art').classList.remove('fade-in');
        run('animateNarrationIn()');
        assert.ok(elements.get('quote-art').classList.contains('fade-in'));
    }
});


test('opening a sheet establishes its closed layout after stacking and before the open class', () => {
    const { run } = reader();
    run(`const order = []; document.body = { style: {} };
        const parent = { lastElementChild: null, appendChild(sheet) { order.push('stack'); this.lastElementChild = sheet; } };
        const panel = { getBoundingClientRect() { order.push('layout'); } };
        const sheet = { parentNode: parent, classList: { add() { order.push('open'); } }, setAttribute() {},
            querySelector: selector => selector === '.modal-panel' ? panel : null };
        openSheet(sheet);`);
    assert.equal(run("order.join(',')"), 'stack,layout,open');
    run('order.length = 0; openSheet(sheet)');
    assert.equal(run("order.join(',')"), 'layout,open', 'an already-topmost sheet is not reparented');
});


test('quotes stay hidden while loading and become ready only with the narration', () => {
    const { elements, run } = reader();
    run('setLoading(false)'); assert.equal(elements.get('hadith-card').classList.contains('is-ready'), true);
    run('setLoading(true)'); assert.equal(elements.get('hadith-card').classList.contains('is-ready'), false);
    run('setLoading(false)'); assert.equal(elements.get('hadith-card').classList.contains('is-ready'), true);
});
