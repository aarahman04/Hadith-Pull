import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('occasion menus preserve the selected value, persist changes and update their visible label', () => {
    const elements = new Map(), choices = [], saved = new Map(); let menu;
    function node() { return { attributes: {}, events: {}, append() {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(type, action) { (this.events[type] ||= []).push(action); } }; }
    for (const id of ['pool', 'specialDaysOn', 'recurringFastsOn', 'hijriAdjustment']) {
        const input = node(); input.type = id.endsWith('On') ? 'checkbox' : 'select-one'; input.tagName = input.type === 'checkbox' ? 'INPUT' : 'SELECT';
        input.options = id === 'pool' ? [{ value: 'BUKHARI_MUSLIM', textContent: 'Bukhari and Muslim — Sahih' }, { value: 'ALL_SAHIH', textContent: 'All Sahih narrations' }]
            : [{ value: '-1', textContent: '−1 day' }, { value: '0', textContent: 'Umm al-Qura' }, { value: '1', textContent: '+1 day' }];
        Object.defineProperty(input, 'selectedOptions', { get: () => input.options.filter(option => option.value === input.value) });
        input.parentElement = { firstChild: { textContent: id } }; input.after = choice => choices.push(choice);
        input.dispatchEvent = event => input.events[event.type]?.forEach(action => action(event)); elements.set('occasion-' + id, input);
    }
    elements.set('occasion-controls', {}); elements.set('occasion-export', node());
    const context = vm.createContext({ document: { getElementById: id => elements.get(id), addEventListener() {} },
        Parity: { Local: { get: (key, fallback) => saved.get(key) ?? fallback, set: (key, value) => saved.set(key, value) } },
        Topics: { el: node, mark: node, button(_, action) { return Object.assign(node(), { action }); } }, HadithOccasions: {},
        openMenu: (_, value) => menu = value, setInterval() {}, location: { pathname: '/search' }, Event: class { constructor(type) { this.type = type; } } });
    vm.runInContext(readFileSync(new URL('../daily.js', import.meta.url), 'utf8'), context);
    assert.equal(elements.get('occasion-pool').hidden, true);
    choices[0].action(); assert.equal(menu.items[0].checked, true); menu.items[1].onSelect();
    assert.equal(saved.get('occasionSettings').pool, 'ALL_SAHIH');
    assert.equal(choices[0].attributes['aria-label'], 'pool: All Sahih narrations');
    choices[1].action(); menu.items[2].onSelect();
    assert.equal(saved.get('occasionSettings').hijriAdjustment, 1);
});
