import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function motion(reduced = false) {
    const context = vm.createContext({
        Parity: { Local: {} },
        document: { getElementById() { return null; }, addEventListener() {} },
        location: { pathname: '/' },
        fetch: () => Promise.reject(Error('No network in this test')),
        matchMedia: () => ({ matches: reduced }), getComputedStyle: () => ({ opacity: '1' })
    });
    vm.runInContext(readFileSync(new URL('../topics.js', import.meta.url), 'utf8'), context);
    return vm.runInContext('Topics', context);
}

test('rapid filter changes cancel the old fade and only paint the latest results', async () => {
    const { transition } = motion(), animations = [], paints = [];
    const node = {
        isConnected: true, childNodes: [{}], getAnimations: () => animations,
        animate() {
            let finish;
            const finished = new Promise(resolve => { finish = resolve; });
            const animation = { finished, finish, cancel: finish };
            animations.push(animation); return animation;
        }
    };
    const old = transition(node, () => paints.push('old'));
    const latest = transition(node, () => paints.push('latest'));
    animations[1].finish();
    await Promise.all([old, latest]);
    assert.deepEqual(paints, ['latest']);
    assert.equal(animations.length, 3, 'one entrance follows the latest exit');
});

test('reduced motion paints immediately and detached result lists never paint', async () => {
    const { transition } = motion(true); let paints = 0;
    const node = { isConnected: true, childNodes: [{}], getAnimations: () => [], animate() { assert.fail('reduced motion must not animate'); } };
    await transition(node, () => paints++);
    assert.equal(paints, 1);
    node.isConnected = false;
    await transition(node, () => paints++);
    assert.equal(paints, 1);
});

test('narration arrow keys page from text and controls, while typing and modified keys stay native', () => {
    const { pageDirection } = motion();
    const event = { key: 'ArrowRight', target: { tagName: 'BUTTON' } };
    assert.equal(pageDirection(event), 1);
    assert.equal(pageDirection({ ...event, key: 'ArrowLeft', target: { tagName: 'DIV' } }), -1);
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) assert.equal(pageDirection({ ...event, target: { tagName } }), 0);
    for (const flag of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'repeat', 'defaultPrevented']) assert.equal(pageDirection({ ...event, [flag]: true }), 0);
    assert.equal(pageDirection({ ...event, target: { tagName: 'DIV', isContentEditable: true } }), 0);
    assert.equal(pageDirection({ ...event, key: 'ArrowDown' }), 0);
});


test('mode switches overlap outgoing and incoming content and clean up rapid reversals', async () => {
    const animations = [], ghosts = [], paints = [];
    const animate = frames => {
        let finish; const finished = new Promise(resolve => finish = resolve);
        const animation = { frames, finished, finish, cancel: finish }; animations.push(animation); return animation;
    };
    const node = { isConnected: true, style: {}, offsetTop: 40, offsetLeft: 0, offsetWidth: 600,
        getBoundingClientRect: () => ({ height: 300 }), getAnimations: () => [], animate,
        after(ghost) { ghosts.push(ghost); }, cloneNode() {
            return { style: {}, classList: { add() {} }, removeAttribute() {}, setAttribute() {}, querySelectorAll: () => [], animate,
                removed: false, remove() { this.removed = true; } };
        }
    };
    const { modeTransition } = motion();
    await modeTransition(node, () => paints.push('describe'));
    assert.equal(ghosts[0].removed, false);
    assert.deepEqual(Array.from(animations[0].frames, f => f.opacity), [1, 0]);
    assert.deepEqual(Array.from(animations[1].frames, f => f.opacity), [0, 1]);
    await modeTransition(node, () => paints.push('search'));
    assert.equal(ghosts[0].removed, true); assert.equal(ghosts[1].removed, false);
    animations[2].finish(); animations[3].finish(); await new Promise(setImmediate);
    assert.equal(ghosts[1].removed, true); assert.equal(node.style.minHeight, undefined);
    const before = animations.length;
    await motion(true).modeTransition(node, () => paints.push('describe'));
    assert.equal(animations.length, before); assert.deepEqual(paints, ['describe', 'search', 'describe']);
});
