import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function reader(reduced = false) {
    const elements = new Map();
    const timers = new Map();
    for (const id of ['generate-btn', 'dock', 'hadith-card', 'hadith-content', 'arabic-block', 'expand-btn', 'script-bar', 'metadata', 'narration']) {
        const classes = new Set();
        const element = {
            hidden: ['arabic-block', 'metadata'].includes(id), style: {}, naturalHeight: id === 'arabic-block' ? 240 : 100,
            classList: { toggle() {}, add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
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
        document: { getElementById: id => elements.get(id), addEventListener() {} }, navigator: {}, addEventListener() {},
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
