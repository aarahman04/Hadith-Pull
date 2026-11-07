import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url), Parity = require('../parity-core.js');
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const settle = () => new Promise(setImmediate);

async function categories() {
    const events = new Map(), frames = [], main = { scrollTop: 0 };
    function node() {
        const listeners = new Map();
        return { children: [], dataset: {}, isConnected: true, style: { setProperty() {} },
            classList: { add() {}, toggle() {} }, setAttribute() {}, focus() {},
            addEventListener: (name, action) => listeners.set(name, action),
            click: () => listeners.get('click')?.(),
            get childNodes() { return this.children; }, closest: () => main,
            append(...children) { for (const child of children) child.parent = this; this.children.push(...children); },
            prepend(...children) { this.children.unshift(...children); },
            replaceChildren(...children) { this.children = []; this.append(...children); },
            remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
        };
    }
    const root = node();
    const context = vm.createContext({
        Parity: { ...Parity, Local: { get() {} } }, URL, console,
        document: { createElement: node, getElementById: id => id === 'categories-root' ? root : null,
            addEventListener: (name, action) => events.set(name, action) },
        location: new URL('https://hadithpull.online/'), scrollY: 0,
        matchMedia: () => ({ matches: true }), requestAnimationFrame: fn => frames.push(fn),
        fetch: async file => ({ ok: true, json: async () => JSON.parse(read(file)) }),
        findRecord: async key => ({ record: { key, collectionTitle: 'Bukhari', ref: key, english: 'A narration excerpt' } }),
        toHadith: record => record, gradeClass: () => '', gradeLabel: () => 'Sahih', buildExcerpt: text => text
    });
    context.window = context; context.scrollTo = (_, top) => { context.scrollY = top; };
    vm.runInContext(read('topics.js'), context);
    await vm.runInContext('Topics.load()', context);
    function beginVisit(id) {
        context.location = new URL('https://hadithpull.online/categories?id=' + id);
        events.get('screenchange')({ detail: 'categories' });
    }
    async function visit(id) {
        beginVisit(id);
        await settle();
    }
    function flush() { frames.splice(0).forEach(fn => fn()); }
    return { context, root, main, visit, beginVisit, flush, frames };
}

test('category routes start at the top and restore phone and desktop scroll positions', async () => {
    const { context, root, main, visit, flush } = await categories();
    await visit('quran'); main.scrollTop = 180; context.scrollY = 300;
    await visit('virtues-of-surahs');
    assert.equal(root.dataset.ready, 'true');
    assert.equal(main.scrollTop, 0); assert.equal(context.scrollY, 0);
    main.scrollTop = 1300; context.scrollY = 900;
    await visit('quran'); flush();
    assert.equal(main.scrollTop, 180); assert.equal(context.scrollY, 300);
    await visit('virtues-of-surahs'); flush();
    assert.equal(main.scrollTop, 1300); assert.equal(context.scrollY, 900);
});

test('Load more continues after returning to a cached topic', async () => {
    const { root, visit, flush } = await categories();
    await visit('virtues-of-surahs');
    const list = root.children.find(n => n.className === 'narration-list');
    const more = root.children.find(n => n.textContent === 'Load more');
    assert.equal(list.children.length, 15);
    await visit('quran'); await visit('virtues-of-surahs'); flush();
    assert.ok(root.children.includes(list), 'returning restores the mounted list');
    await more.click();
    assert.equal(list.children.length, 30);
});

test('an outdated cached scroll callback cannot move the newly selected category', async () => {
    const { context, root, main, visit, frames, flush } = await categories();
    await visit('virtues-of-surahs'); main.scrollTop = 1300; context.scrollY = 900;
    await visit('quran'); main.scrollTop = 180; context.scrollY = 300;
    await visit('virtues-of-surahs');
    const restoreTopic = frames.shift();
    await visit('quran');
    assert.equal(root.dataset.route, 'quran');
    restoreTopic(); assert.equal(main.scrollTop, 180); assert.equal(context.scrollY, 300);
    flush(); assert.equal(main.scrollTop, 180); assert.equal(context.scrollY, 300);
});

test('a category finishing in the background retains its requested route', async () => {
    const { context, root, beginVisit } = await categories();
    beginVisit('quran');
    context.location = new URL('https://hadithpull.online/?h=urn:10');
    await settle();
    const banner = root.children.find(n => n.className === 'category-detail-banner');
    assert.ok(banner, 'switching tabs while loading must not replace the requested subject with the catalog');
    assert.equal(banner.children[1].children[1].textContent, "The Qur'an");
});
