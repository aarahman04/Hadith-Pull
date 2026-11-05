import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function setup(reduced = false) {
    const attributes = {}, pending = [];
    const button = { dataset: {}, setAttribute(key, value) { attributes[key] = value; },
        getBoundingClientRect() {}, getAnimations() { return pending; } };
    const classes = new Set(), saved = new Map();
    const classList = { remove: name => classes.delete(name), add: name => classes.add(name), contains: name => classes.has(name), toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } };
    const themeButton = { ...button, dataset: {}, classList, offsetWidth: 44 };
    const document = { documentElement: { dataset: {}, classList }, getElementById: id => id === 'language-btn' ? button : id === 'theme-btn' ? themeButton : null, addEventListener() {} };
    const context = vm.createContext({ document, addEventListener() {}, matchMedia: () => ({ matches: reduced }),
        localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) } }); context.window = context;
    vm.runInContext(readFileSync(new URL('../script.js', import.meta.url), 'utf8'), context);
    context.control = button; return { context, button, themeButton, classes, attributes, pending, run: code => vm.runInContext(code, context) };
}

test('pill input stays locked until every fill animation settles, including cancellations', async () => {
    const { context, button, pending, run } = setup(); let first, second;
    pending.push({ finished: new Promise(resolve => first = resolve) }, { finished: new Promise((_, reject) => second = reject) });
    const other = context.other = {};
    run('lockPill(control, [control, other])'); assert.equal(button.disabled, true); assert.equal(other.disabled, true);
    first(); await new Promise(setImmediate); assert.equal(button.disabled, true);
    second(Error('Cancelled')); await new Promise(setImmediate);
    assert.equal(button.disabled, false); assert.equal(other.disabled, false); assert.equal(button.dataset.switching, undefined);
});

test('English-Arabic ignores repeat requests during the fill and accepts one after completion', async () => {
    const { context, pending, run } = setup(); let finish, changes = 0;
    pending.push({ finished: new Promise(resolve => finish = resolve) }); context.setReadingLanguage = () => changes++;
    run('toggleReadingLanguage(); toggleReadingLanguage()'); assert.equal(changes, 1);
    finish(); await new Promise(setImmediate); run('toggleReadingLanguage()'); assert.equal(changes, 2);
});

test('reduced-motion pills never introduce an artificial wait', () => {
    const { button, run } = setup(true); run('lockPill(control)'); assert.ok(!button.disabled);
});

test('light-dark ignores another selection until the theme glyph finishes', async () => {
    const { themeButton, classes, pending, run } = setup(); let finish;
    pending.push({ finished: new Promise(resolve => finish = resolve) });
    run("setTheme('dark'); setTheme('light')");
    assert.equal(classes.has('dark'), true); assert.equal(themeButton.disabled, true);
    finish(); await new Promise(setImmediate);
    run("setTheme('light')"); assert.equal(classes.has('dark'), false);
});
