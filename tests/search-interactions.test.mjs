import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function disclosure(reduced = false) {
    const animations = []; let click;
    const panel = { hidden: true, querySelector() { return reveal; } };
    const trigger = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(_, action) { click = action; } };
    const reveal = { scrollHeight: 200, getBoundingClientRect: () => ({ height: 80 }), animate(frames) {
        let finish; const finished = new Promise(resolve => finish = resolve);
        const animation = { frames, finished, finish, cancelled: false, cancel() { this.cancelled = true; finish(); } };
        animations.push(animation); return animation;
    } };
    const context = vm.createContext({ document: { getElementById() { return null; } }, Parity: { Local: {} }, Topics: {}, matchMedia: () => ({ matches: reduced }) });
    vm.runInContext(readFileSync(new URL('../search.js', import.meta.url), 'utf8'), context);
    context.panel = panel; context.trigger = trigger; const setOpen = vm.runInContext('SearchPage.initFilterDisclosure(panel, trigger)', context);
    return { panel, animations, setOpen, click: () => click({ preventDefault() {} }) };
}

test('filter open-close-reopen keeps the final state despite cancelled animation completions', async () => {
    const { panel, animations, click } = disclosure(); click(); click(); click();
    assert.ok(animations[0].cancelled && animations[1].cancelled);
    animations[2].finish(); await Promise.resolve(); assert.equal(panel.hidden, false);
    click(); animations[3].finish(); await Promise.resolve(); assert.equal(panel.hidden, true);
});

test('reduced-motion filters change state immediately', () => {
    const { panel, animations, click } = disclosure(true);
    click(); assert.equal(panel.hidden, false); click(); assert.equal(panel.hidden, true); assert.equal(animations.length, 0);
});


test('switching back to Search closes an animating filter panel immediately', async () => {
    const { panel, animations, setOpen, click } = disclosure(); click();
    setOpen(false, true); await Promise.resolve();
    assert.equal(panel.hidden, true); assert.ok(animations[0].cancelled);
});


test('removing recent queries waits for the fade and collapse before committing', async () => {
    let finish, committed = false, frames;
    const context = vm.createContext({ document: { getElementById() { return null; } }, Parity: { Local: {} }, Topics: {}, matchMedia: () => ({ matches: false }) });
    vm.runInContext(readFileSync(new URL('../search.js', import.meta.url), 'utf8'), context);
    context.nodes = [{ getAnimations: () => [], getBoundingClientRect: () => ({ height: 48 }), animate(value) { frames = value; return { finished: new Promise(resolve => finish = resolve) }; } }];
    context.commit = () => committed = true;
    const removing = vm.runInContext('SearchPage.removeRecents(nodes, commit)', context);
    assert.equal(committed, false); assert.equal(context.nodes[0].inert, true); assert.equal(frames[1].height, '0px');
    finish(); await removing; assert.equal(committed, true);
});
