import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const settle = () => new Promise(setImmediate);

async function site(initial = '/') {
    const events = new Map(), requests = [], screens = new Map(), messages = [];
    const listen = (name, callback) => events.set(name, callback);
    function source(key) {
        const heading = { focus() {} };
        const main = { dataset: {}, hidden: false, scrollTop: 0, getAnimations: () => [], animate(frames, options) { this.frames = frames; this.animation = options; },
            querySelector: () => heading };
        screens.set(key, main);
        return { title: key, querySelector: selector => selector === 'main' ? main : selector.startsWith('meta') ? { content: key + ' description' } : null,
            querySelectorAll: () => [], getElementById: () => ({}) };
    }
    const documents = new Map(['read', 'bookmarks', 'about', 'privacy'].map(key => [key, source(key)]));
    const document = Object.assign(documents.get(initial.includes('bookmarks') ? 'bookmarks' : 'read'), {
        documentElement: { dataset: {} },
        body: { classList: { toggle() {} }, appendChild: node => queueMicrotask(() => node.onload()) },
        createElement: () => ({}), addEventListener: listen,
        dispatchEvent: event => events.get(event.type)?.(event)
    });
    const originalQuery = document.querySelector;
    document.querySelector = selector => selector === '.site-footer' ? { before() {} }
        : selector === '.header-actions' ? { prepend() {} }
        : selector.startsWith('.modal') ? null : originalQuery(selector);
    const context = vm.createContext({
        document, URL, Promise, Map, queueMicrotask, performance, innerWidth: 390,
        location: new URL(initial, 'https://hadithpull.online'), scrollY: 0,
        console: { error() {} },
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
        DOMParser: class { parseFromString(key) { return documents.get(key); } },
        fetch: async file => { requests.push(file); return { ok: true, text: async () => file.replace('.html', '').replace('index', 'read') }; },
        initReader() {}, closeMenu() {}, closeSheet() {}, openShared() {}, toast: text => messages.push(text),
        matchMedia: () => ({ matches: true }), addEventListener: listen,
        getSelection: () => ({ toString: () => '' })
    });
    context.window = context;
    context.scrollTo = (_, top) => { context.scrollY = top; };
    context.history = {
        pushState: (_, __, url) => { context.location = new URL(url); },
        replaceState: (_, __, url) => { context.location = new URL(url); }
    };
    vm.runInContext(read('navigation.js'), context);
    await settle();
    function click(href, extra = {}) {
        const link = { href: new URL(href, context.location).href, target: '',
            hasAttribute: () => false, getAttribute: () => href };
        const event = { target: { closest: () => link }, button: 0,
            preventDefault() { this.defaultPrevented = true; }, ...extra };
        events.get('click')(event);
        return event;
    }
    return { context, events, requests, screens, messages, click,
        run: code => vm.runInContext(code, context) };
}

test('all main screens preload once; cycling preserves mounted content, scroll, and narration URL', async () => {
    const { context, requests, screens, run } = await site('/?h=urn:10');
    const reader = screens.get('read');
    reader.scrollTop = 240;
    reader.expanded = true;
    assert.deepEqual(requests.sort(), ['about.html', 'bookmarks.html']);
    for (const name of ['bookmarks', 'about', 'read']) {
        run('SiteNavigation.cycle(1)');
        await settle();
        assert.equal(screens.get(name).hidden, false, name);
        assert.equal([...screens.values()].filter(screen => screen.dataset.page && !screen.hidden).length, 1);
    }
    assert.equal(reader.scrollTop, 240);
    assert.equal(reader.expanded, true);
    assert.equal(context.location.searchParams.get('h'), 'urn:10');
    assert.equal(requests.length, 2);
    run('SiteNavigation.cycle(-1)');
    await settle();
    assert.equal(context.location.pathname, '/about');
});

test('desktop screens fade slowly and respect reduced-motion preferences', async () => {
    const { context, screens, run } = await site();
    context.matchMedia = () => ({ matches: false });
    context.document.startViewTransition = () => { throw Error('Desktop should use the fade animation'); };
    run('SiteNavigation.cycle(1)');
    await settle();
    assert.equal(screens.get('bookmarks').animation.duration, 650);
    assert.equal(screens.get('bookmarks').animation.easing, 'ease-in-out');
    assert.equal(screens.get('bookmarks').frames[0].opacity, 0);
    assert.equal(screens.get('bookmarks').frames[0].transform, undefined);
    context.matchMedia = () => ({ matches: true });
    run('SiteNavigation.cycle(1)');
    await settle();
    assert.equal(screens.get('about').animation, undefined);
});

test('phones slide without fading when native transitions are unavailable', async () => {
    const { context, screens, run } = await site();
    context.matchMedia = query => ({ matches: !query.includes('prefers-reduced-motion') });
    run('SiteNavigation.cycle(1)');
    await settle();
    assert.equal(screens.get('bookmarks').frames[0].transform, 'translateX(-100vw)');
    assert.equal(screens.get('bookmarks').frames[0].opacity, undefined);
});

test('native phone transitions update the mounted pages and reverse direction when going back', async () => {
    const { context, screens, run } = await site();
    context.matchMedia = query => ({ matches: !query.includes('prefers-reduced-motion') });
    let updates = 0;
    context.document.startViewTransition = update => {
        const done = Promise.resolve().then(() => { updates++; update(); });
        return { ready: done, updateCallbackDone: done, finished: done, skipTransition() {} };
    };
    run('SiteNavigation.cycle(1)');
    await settle();
    assert.equal(screens.get('bookmarks').hidden, false);
    assert.equal(screens.get('bookmarks').animation, undefined);
    assert.equal(context.document.documentElement.dataset.slideDirection, 'forward');
    run('SiteNavigation.cycle(-1)');
    await settle();
    assert.equal(screens.get('read').hidden, false);
    assert.equal(context.document.documentElement.dataset.slideDirection, 'back');
    assert.equal(updates, 2);
});

test('background draws never change the current route; Back restores screens without fetching', async () => {
    const { context, events, requests, screens, click, run } = await site('/bookmarks.html#folder_1');
    run("SiteNavigation.setReadKey('urn:20')");
    assert.equal(context.location.pathname, '/bookmarks.html');
    click('/about');
    await settle();
    click('/');
    await settle();
    assert.equal(context.location.searchParams.get('h'), 'urn:20');
    context.location = new URL('https://hadithpull.online/bookmarks.html#folder_1');
    events.get('popstate')();
    await settle();
    assert.equal(screens.get('bookmarks').hidden, false);
    assert.equal(context.location.hash, '#folder_1');
    assert.equal(requests.length, 2);
});

test('secondary pages load once; failed navigation keeps the current screen and can retry', async () => {
    const app = await site();
    app.context.fetch = async file => {
        app.requests.push(file);
        return { ok: false };
    };
    app.click('/privacy');
    await settle();
    assert.equal(app.screens.get('read').hidden, false);
    assert.equal(app.context.location.pathname, '/');
    assert.match(app.messages[0], /Could not open/);
    app.context.fetch = async file => {
        app.requests.push(file);
        return { ok: true, text: async () => 'privacy' };
    };
    app.click('/privacy');
    await settle();
    assert.equal(app.screens.get('privacy').hidden, false);
    app.click('/');
    await settle();
    app.click('/privacy');
    await settle();
    assert.equal(app.requests.filter(file => file === 'privacy.html').length, 2);
    assert.equal(app.click('https://example.com').defaultPrevented, undefined);
    assert.equal(app.click('/about', { ctrlKey: true }).defaultPrevented, undefined);
});

test('swipes switch tabs while vertical scroll, browser edges, and multi-touch retain their behavior', async () => {
    const { events, screens } = await site();
    const target = { closest: selector => selector === 'main' ? screens.get('read') : null };
    const touch = (x, y) => ({ clientX: x, clientY: y });
    async function swipe(from, to, touches = [from]) {
        events.get('touchstart')({ target, touches });
        events.get('touchmove')({ touches: [to], cancelable: true, preventDefault() {} });
        events.get('touchend')({ changedTouches: [to] });
        await settle();
    }
    await swipe(touch(200, 100), touch(190, 230));
    await swipe(touch(5, 100), touch(200, 100));
    await swipe(touch(250, 100), touch(100, 100), [touch(250, 100), touch(230, 100)]);
    assert.equal(screens.get('read').hidden, false);
    await swipe(touch(250, 100), touch(100, 105));
    assert.equal(screens.get('bookmarks').hidden, false);
    await swipe(touch(100, 100), touch(250, 105));
    assert.equal(screens.get('read').hidden, false);
});

test('reader shortcuts scroll without focus and preserve typing, dialogs, and selected-text copying', () => {
    const events = new Map(), actions = [];
    let reading = true, selected = '', popup = false;
    const narration = { clientHeight: 400, scrollHeight: 1200, scrollTop: 0, addEventListener() {} };
    const context = vm.createContext({
        URL, URLSearchParams, console, navigator: {},
        document: { getElementById: id => id === 'narration' ? narration : ['generate-btn', 'expand-btn'].includes(id) ? {} : null,
            querySelector: () => popup, addEventListener: (name, callback) => events.set(name, callback) },
        addEventListener() {}, getSelection: () => ({ toString: () => selected }),
        SiteNavigation: { isReading: () => reading, cycle: direction => actions.push(['tab', direction]) },
        actions
    });
    context.window = context;
    vm.runInContext(read('script.js'), context);
    vm.runInContext('draw = () => actions.push(["draw"]); copyText = () => actions.push(["copy"]); toggleExpand = () => actions.push(["expand"]); scrollNarrationTo = top => actions.push(["scroll", top]); current = {}; initShortcuts();', context);
    function key(value, options = {}) {
        const event = { key: value, target: { tagName: 'H1' }, preventDefault() { this.prevented = true; }, ...options };
        events.get('keydown')(event);
        return event;
    }
    key('ArrowDown');
    key('PageDown');
    key('ArrowRight');
    key('+');
    key('N');
    key('c', { ctrlKey: true });
    key('Enter');
    key(' ', { code: 'Space' });
    assert.deepEqual(actions.map(action => Array.from(action)), [['scroll', 64], ['scroll', 340], ['tab', 1], ['draw'], ['draw'], ['copy'], ['draw'], ['expand']]);
    assert.equal(key('Enter', { target: { tagName: 'BUTTON' } }).prevented, undefined);
    assert.equal(key('Enter', { target: { tagName: 'INPUT' } }).prevented, undefined);
    assert.equal(key(' ', { code: 'Space', target: { tagName: 'BUTTON' } }).prevented, undefined);
    selected = 'Selected words';
    assert.equal(key('c', { ctrlKey: true }).prevented, undefined);
    assert.equal(key('ArrowDown', { target: { tagName: 'INPUT' } }).prevented, undefined);
    popup = true;
    assert.equal(key('N').prevented, undefined);
    assert.equal(key('Enter').prevented, undefined);
    assert.equal(key(' ', { code: 'Space' }).prevented, undefined);
    popup = false;
    reading = false;
    assert.equal(key('N').prevented, undefined);
    assert.equal(key('ArrowDown').prevented, undefined);
    assert.equal(key('Enter').prevented, undefined);
    assert.equal(key(' ', { code: 'Space' }).prevented, undefined);
    assert.equal(actions.length, 8);
});

test('scrolling eases repeated input, finishes on rounded scroll positions, and supports cancellation and reduced motion', () => {
    for (const rate of [60, 120]) {
        const frames = new Map();
        let frameId = 0, time = 0, position = 0, reduced = false;
        const narration = { scrollHeight: 2000, clientHeight: 400,
            get scrollTop() { return position; }, set scrollTop(value) { position = Math.round(value); } };
        const context = vm.createContext({
            document: { getElementById: id => id === 'narration' ? narration : null, addEventListener() {} },
            addEventListener() {}, navigator: {}, performance: { now: () => time },
            matchMedia: () => ({ matches: reduced }),
            requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
            cancelAnimationFrame: id => frames.delete(id)
        });
        context.window = context;
        vm.runInContext(read('script.js'), context);
        const run = code => vm.runInContext(code, context);
        function tick(count = 1) {
            for (let i = 0; i < count; i++) {
                time += 1000 / rate;
                const pending = [...frames.values()];
                frames.clear();
                pending.forEach(callback => callback(time));
            }
        }
        run('scrollNarrationTo(64)');
        tick();
        assert.ok(position > 0 && position < 64, rate + 'Hz begins smoothly');
        run('scrollNarrationTo(narrationScrollTarget + 64)');
        assert.equal(frames.size, 1);
        tick(rate);
        assert.equal(position, 128);
        assert.equal(frames.size, 0);
        run('scrollNarrationTo(5000)');
        tick(rate);
        assert.equal(position, 1600);
        run('scrollNarrationTo(-100)');
        tick();
        run('stopNarrationScroll()');
        const stopped = position;
        tick();
        assert.equal(position, stopped);
        assert.equal(frames.size, 0);
        reduced = true;
        run('scrollNarrationTo(64)');
        assert.equal(position, 64);
        assert.equal(frames.size, 0);
    }
});
