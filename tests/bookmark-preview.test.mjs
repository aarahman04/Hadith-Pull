import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function folderView(hash = '#folder', mobile = false) {
    const nodes = [], opened = [], copied = [], shared = [], messages = [];
    let finish, menu;
    const closing = new Promise(resolve => finish = resolve);
    function node(tag = 'div') {
        const lookups = new Map(), events = new Map(), classes = new Set();
        const n = { tag, value: '', children: [], attributes: {}, isConnected: true, style: { setProperty() {} }, hidden: false,
            classList: { add: x => classes.add(x), remove: x => classes.delete(x), toggle(x, on) { on ? classes.add(x) : classes.delete(x); } },
            setAttribute(key, value) { this.attributes[key] = value; },
            set innerHTML(value) { this.html = value; this.children = []; lookups.clear(); },
            querySelector(selector) { if (!lookups.has(selector)) lookups.set(selector, node()); return lookups.get(selector); },
            append(...children) { this.children.push(...children); }, appendChild(child) { this.append(child); },
            prepend(...children) { this.children.unshift(...children); }, after() {},
            replaceChildren(...children) { this.children = children; },
            addEventListener(type, action) { events.set(type, action); },
            click: () => events.get('click')?.(), fire: type => events.get(type)?.(), closest: () => ({ hidden: false }),
            getAnimations: () => [{ finished: closing }] };
        nodes.push(n); return n;
    }
    const root = node(), folder = { id: 'folder', name: 'Saved narrations' };
    const items = [{ id: 'one', key: 'urn:10', collectionTitle: 'Bukhari', ref: 1, english: 'First narration', savedAt: 1 },
        { id: 'two', key: 'bukhari:2', collectionTitle: 'Bukhari', ref: 2, english: 'Second narration', savedAt: 2 }];
    const context = vm.createContext({
        document: { getElementById: id => id === 'bookmarks-root' ? root : null, createElement: node, addEventListener() {}, removeEventListener() {}, querySelector: () => null },
        window: { addEventListener() {} }, location: { hash }, matchMedia: () => ({ matches: mobile }), requestAnimationFrame: callback => queueMicrotask(callback),
        readPreference: () => 'state', closeMenu() {}, plural: (n, word) => `${n} ${word}`, ICONS: {},
        BookmarkStore: { getFolder: () => hash === '#folder' ? folder : null, getItems: () => items, getFolders: () => [folder], countIn: () => 2, readingSource: () => ({ keys: items.map(i => i.key) }) },
        savedToHadith: item => item, hadithKey: h => h.key, buildExcerpt: text => text,
        Topics: { detail: (...args) => opened.push(args),
            el(tag, className, textContent) { return Object.assign(node(tag), { className, textContent }); },
            button(text, action, className) { const b = Object.assign(node('button'), { textContent: text, className }); b.addEventListener('click', action); return b; },
            mark: () => node(), transition: (_, paint) => paint(), sheet: () => ({ modal: node(), body: node() }) },
        paintStatus() {}, closeSheet(modal) { modal.closed = true; }, openMenu: (_, options) => menu = options,
        copyHadith: async h => { copied.push(h.key); return true; }, openCard: h => shared.push(h.key), toast: text => messages.push(text)
    });
    const code = readFileSync(new URL('../bookmarks.js', import.meta.url), 'utf8');
    vm.runInContext(code.slice(code.lastIndexOf('\n(function () {')), context);
    return { nodes, opened, finish, copied, shared, messages, menu: () => menu };
}

test('folder papers contain narration previews and tuck away before the shared reader opens', async () => {
    const view = folderView(), papers = view.nodes.filter(n => n.className === 'folder-paper');
    assert.equal(papers.length, 2);
    assert.equal(papers[0].children[1].textContent, 'First narration');
    const opening = papers[0].click(); await Promise.resolve();
    assert.equal(view.opened.length, 0, 'the folder finishes closing before the sheet opens');
    await papers[1].click(); assert.equal(view.opened.length, 0, 'a second selection cannot interrupt the folder closing');
    view.finish(); await opening;
    const [keys, index, topic, anchor, language, source, manage] = view.opened[0];
    assert.deepEqual(Array.from(keys), ['urn:10', 'bukhari:2']);
    assert.equal(index, 0); assert.equal(topic, null); assert.equal(anchor, papers[0]);
    assert.equal(language, 'en'); assert.equal(source, 'bookmarks:folder');
    manage({}, 1);
    const menu = view.menu();
    assert.deepEqual(Array.from(menu.items.filter(x => x !== 'sep'), x => x.label), ['Copy', 'Share', 'Move to…', 'Also save to…', 'Remove from folder']);
    await menu.items[0].onSelect(); menu.items[1].onSelect();
    assert.deepEqual(view.copied, ['bukhari:2']); assert.deepEqual(view.shared, ['bukhari:2']);
});

test('Open in Read is available inside Your folders and absent from the Bookmarks landing page', () => {
    const folder = folderView(), landing = folderView('');
    assert.equal(folder.nodes.filter(n => n.className === 'bookmark-read-float').length, 1);
    assert.equal(landing.nodes.filter(n => n.className === 'bookmark-read-float').length, 0);
});

test('folder list filters previews and opens the exact result in its folder context', () => {
    const view = folderView();
    view.nodes.find(n => n.className === 'icon-btn folder-tile-menu').click(); view.menu().items[0].onSelect();
    const input = view.nodes.find(n => n.className === 'topic-search'), list = view.nodes.find(n => n.className === 'bookmark-narration-list');
    assert.equal(list.children.length, 2);
    input.value = 'Second'; input.fire('input');
    assert.equal(list.children.length, 1); assert.equal(list.children[0].children[1].textContent, 'Second narration');
    list.children[0].click();
    assert.equal(view.opened[0][1], 1); assert.equal(view.opened[0][2], null); assert.equal(view.opened[0][5], 'bookmarks:folder');
    input.value = 'absent'; input.fire('input');
    assert.equal(list.children[0].textContent, 'No matching narrations in this folder.');
});

test('phone folder routes open a full list instead of the desktop paper interaction', () => {
    const view = folderView('#folder', true);
    assert.equal(view.nodes.filter(n => n.className === 'folder-art').length, 0);
    const list = view.nodes.find(n => n.className === 'bookmark-narration-list');
    assert.equal(list.children.length, 2);
    list.children[0].click(); assert.equal(view.opened[0][1], 0); assert.equal(view.opened[0][5], 'bookmarks:folder');
});
