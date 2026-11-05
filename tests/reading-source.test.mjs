import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url), Parity = require('../parity-core.js');
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

async function source() {
    const values = new Map();
    function node() {
        return { children: [], attributes: {}, isConnected: true, addEventListener() {}, remove() {},
            setAttribute(key, value) { this.attributes[key] = value; },
            append(...children) { this.children.push(...children); },
            replaceChildren(...children) { this.children = children; } };
    }
    const trigger = node();
    const context = vm.createContext({
        Parity: { ...Parity, Local: { get: key => values.get(key), set: (key, value) => values.set(key, value) } },
        document: { createElement: node, getElementById: id => id === 'read-from' ? trigger : null, addEventListener() {} },
        location: { pathname: '/' }, addEventListener() {},
        matchMedia: () => ({ matches: true }),
        fetch: async file => ({ ok: true, json: async () => JSON.parse(read(file)) })
    });
    context.window = context;
    vm.runInContext(read('script.js'), context);
    vm.runInContext(read('topics.js'), context);
    const topics = vm.runInContext('Topics', context);
    await topics.load();
    return { topics, trigger, values, context, node };
}

test('All hadith has visible book artwork in the selected row and in the Read trigger', async () => {
    const { topics, trigger } = await source();
    const all = topics.row({ id: null, title: 'All hadith' }, () => {}, 'Every collection', true);
    assert.ok(all.children[0].innerHTML.includes('<path'), 'missing keys fall back to book artwork');
    assert.equal(all.attributes['aria-pressed'], 'true');
    topics.paintSource();
    assert.ok(trigger.children[0].innerHTML.includes('<path'));
    assert.equal(trigger.children[1].textContent, 'Hadith of the moment');
    assert.equal(trigger.attributes['aria-haspopup'], 'dialog');
});

test('Arabic search results render Arabic with direction metadata and fall back when unavailable', async () => {
    const { topics, context, node } = await source();
    const hadith = { collection: 'bukhari', collectionTitle: 'Sahih al-Bukhari', ref: '1', primary: null, english: 'English narration', arabic: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى' };
    Object.assign(context, { findRecord: async () => ({ record: hadith }), toHadith: h => h, gradeClass: () => 'status-none', gradeLabel: () => 'No grade', buildExcerpt: text => text, hasArabicWorthShowing: text => Boolean(text) });
    const container = node();
    await topics.narrationList(container, ['10'], null, null, [{ urn: '10', missed: ['man'] }], () => false, () => {}, 'ar');
    const excerpt = container.children[0].children[0].children[1];
    assert.equal(excerpt.textContent, hadith.arabic);
    assert.equal(container.children[0].children[0].children.length, 2, 'result cards omit missing-condition notes');
    const identity = container.children[0].children[0].children[0];
    assert.equal(identity.children[0].textContent, 'صحيح البخاري · حديث 1');
    assert.equal(identity.children[1].textContent, 'بدون حكم');
    assert.equal(excerpt.lang, 'ar'); assert.equal(excerpt.dir, 'rtl');
    hadith.arabic = '';
    const fallback = node();
    await topics.narrationList(fallback, ['10'], null, null, [], () => false, () => {}, 'ar');
    assert.equal(fallback.children[0].children[0].children[1].textContent, hadith.english);
});

test('a selected category retains its own icon and label and can return to All hadith', async () => {
    const { topics, trigger, values } = await source();
    values.set('readFrom', 'purification'); topics.paintSource();
    const categoryArt = trigger.children[0].innerHTML;
    assert.equal(trigger.children[1].textContent, 'Purification');
    assert.equal(trigger.attributes['aria-label'], 'Read from: Purification');
    values.set('readFrom', null); topics.paintSource();
    assert.notEqual(trigger.children[0].innerHTML, categoryArt);
    assert.equal(trigger.attributes['aria-label'], 'Read from: All hadith');
});
