import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

function reader() {
    const values = new Map(), properties = new Map(), attributes = new Map(), clicks = new Map();
    const faded = ['hadith-card', 'ref-brief'].map(id => ({ id, getAnimations() { return this.animation ? [this.animation] : []; },
        animate(frames, options) {
            this.frames = frames;
            this.options = options;
            return this.animation = { cancel() { this.cancelled = true; } };
        } }));
    const button = { setAttribute: (key, value) => attributes.set(key, value),
        addEventListener: (key, callback) => clicks.set(key, callback) };
    const context = vm.createContext({
        document: { documentElement: { dataset: {}, style: { setProperty: (key, value) => properties.set(key, value) } },
            getElementById: id => id === 'language-btn' ? button : faded.find(element => element.id === id) || null, addEventListener() {} },
        navigator: { language: 'ar' }, addEventListener() {},
        matchMedia: () => ({ matches: false }),
        localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
        requestAnimationFrame() {}
    });
    context.window = context;
    vm.runInContext(read('script.js'), context);
    return { context, values, properties, attributes, clicks, faded, run: code => vm.runInContext(code, context) };
}

const hadith = {
    collection: 'bukhari', collectionTitle: 'Sahih al-Bukhari', ref: '8', book: '1', inBook: 8,
    english: 'The English narration.', narrator: 'Narrated by a companion',
    arabic: 'هَذَا نَصُّ الْحَدِيثِ بِاللُّغَةِ الْعَرَبِيَّةِ', chapter: 'Revelation',
    primary: { grade: 'Sahih', cat: 'sahih' }, key: 'urn:80', sunnahUrl: 'https://sunnah.com/urn/80'
};

test('all requested Arabic collection IDs match the shipped index; other IDs keep their English title', () => {
    const { context, run } = reader();
    const expected = {
        bukhari: 'صحيح البخاري', muslim: 'صحيح مسلم', abudawud: 'سنن أبي داود',
        tirmidhi: 'جامع الترمذي', nasai: 'سنن النسائي', nawawi40: 'الأربعون النووية',
        qudsi40: 'الأربعون القدسية', shahwaliullah40: 'الأربعون لشاه ولي الله الدهلوي'
    };
    const index = JSON.parse(read('data/v2/index.json'));
    for (const [id, title] of Object.entries(expected)) {
        context.h = { collection: id, collectionTitle: index.collections.find(c => c.id === id)?.title };
        assert.ok(context.h.collectionTitle, id);
        assert.equal(run('arabicCollection(h)'), title);
    }
    for (const id of ['ibnmajah', 'unlisted', '__proto__']) {
        context.h = { collection: id, collectionTitle: 'English title' };
        assert.equal(run('arabicCollection(h)'), 'English title');
    }
});

test('Arabic grades match the entire label, preserve unlisted grades, and distinguish no grade', () => {
    const { context, run } = reader();
    const expected = {
        Sahih: 'صحيح', Hasan: 'حسن', "Da'if": 'ضعيف', 'Hasan Sahih': 'حسن صحيح',
        'Sahih in chain': 'صحيح الإسناد', 'Hasan in chain': 'حسن الإسناد',
        'Sahih li ghairih': 'صحيح لغيره', 'Hasan li ghairih': 'حسن لغيره',
        "Da'if Jiddan": 'ضعيف جدا', Munkar: 'منكر', Shadh: 'شاذ',
        "Maudu'": 'موضوع', 'Maudu’': 'موضوع', 'Maudu (fabricated)': 'موضوع'
    };
    for (const [grade, label] of Object.entries(expected)) {
        context.primary = { grade };
        assert.equal(run('arabicGrade(primary)'), label);
    }
    for (const grade of ['Sahih Mauquf', "Shadh 'anha", 'Mixed', '__proto__']) {
        context.primary = { grade, cat: 'sahih' };
        assert.equal(run('arabicGrade(primary)'), grade);
    }
    assert.equal(run('arabicGrade(null)'), 'بدون حكم');
});

test('Arabic references preserve Western digits, use in-book numbers and handle introductions and missing numbers', () => {
    const { context, run } = reader();
    context.h = { ...hadith };
    assert.equal(run('arabicReference(h)'), 'صحيح البخاري · حديث 8');
    assert.equal(run("arabicReference(h, '، ')"), 'صحيح البخاري، حديث 8');
    context.h.ref = '';
    assert.equal(run('arabicReference(h)'), 'صحيح البخاري · كتاب 1، حديث 8');
    context.h.book = 'introduction';
    assert.equal(run('arabicReference(h)'), 'صحيح البخاري · المقدمة، حديث 8');
    context.h.inBook = null;
    assert.equal(run('arabicReference(h)'), 'صحيح البخاري');
    context.h.inBook = 0;
    assert.equal(run('arabicReference(h)'), 'صحيح البخاري · المقدمة، حديث 0');
});

test('reader Copy and Share use Arabic only when requested and usable; bookmarks retain the exact English output', () => {
    const { context, run } = reader();
    context.h = { ...hadith };
    const links = 'Sunnah.com: https://sunnah.com/urn/80\nRead in Hadith Pull: https://hadithpull.online/h/?k=urn:80';
    const englishCopy = `${hadith.english}\n${hadith.narrator}\n\n${hadith.arabic}\n\nSahih al-Bukhari, Hadith 8 (Sahih)\nChapter: Revelation\n${links}`;
    const englishShare = `"${hadith.english}"\n\n— Sahih al-Bukhari, Hadith 8\n${links}`;
    assert.equal(run("plainText(h, 'en')"), englishCopy);
    assert.equal(run("shareText(h, 'en')"), englishShare);
    assert.equal(run("plainText(h, 'ar')"), `${hadith.arabic}\n\nصحيح البخاري، حديث 8 (صحيح)\nChapter: Revelation\n${links}`);
    assert.equal(run("shareText(h, 'ar')"), `${hadith.arabic}\n\nصحيح البخاري، حديث 8\n${links}`);
    context.document.documentElement.dataset.readingLanguage = 'ar';
    assert.equal(run('plainText(h)'), englishCopy, 'bookmark calls default to English regardless of reading mode');
    assert.equal(run('shareText(h)'), englishShare);
    for (const arabic of ['', 'short', 'chain fragment']) {
        context.h = { ...hadith, arabic };
        assert.equal(run("usesArabic(h, 'ar')"), false);
        assert.equal(run("plainText(h, 'ar')"), run("plainText(h, 'en')"));
        assert.equal(run("shareText(h, 'ar')"), run("shareText(h, 'en')"));
    }
    context.h = { ...hadith, primary: null, chapter: '', sunnahUrl: '', key: '' };
    assert.equal(run("plainText(h, 'ar')"), `${hadith.arabic}\n\nصحيح البخاري، حديث 8 (بدون حكم)`);
    assert.equal(run("shareText(h, 'ar')"), `${hadith.arabic}\n\nصحيح البخاري، حديث 8`);
});

test('readingLanguage defaults to English, rejects garbage, persists, and toggles without drawing', () => {
    const { context, run, values, attributes, clicks } = reader();
    for (const value of [null, undefined, '', 'garbage', 'AR', 'en']) {
        context.value = value;
        assert.equal(run('normalizeReadingLanguage(value)'), 'en');
    }
    assert.equal(run("normalizeReadingLanguage('ar')"), 'ar');
    context.draw = () => { throw Error('Toggling must not draw'); };
    let paints = 0;
    context.paintReadingLanguage = () => paints++;
    values.set('textSize', 'largest');
    values.set('arabicScript', 'bold');
    run('initReadingLanguage()');
    assert.equal(run('readingLanguage()'), 'en', 'browser language does not select the reading mode');
    assert.equal(attributes.get('aria-label'), 'Switch to Arabic');
    clicks.get('click')();
    assert.equal(values.get('readingLanguage'), 'ar');
    assert.equal(attributes.get('aria-pressed'), 'true');
    assert.equal(attributes.get('aria-label'), 'Switch to English');
    run('initReadingLanguage()');
    assert.equal(run('readingLanguage()'), 'ar', 'the stored choice is restored');
    values.set('readingLanguage', 'invalid');
    run('initReadingLanguage()');
    assert.equal(run('readingLanguage()'), 'en');
    assert.equal(attributes.get('aria-pressed'), 'false');
    assert.equal(values.get('textSize'), 'largest');
    assert.equal(values.get('arabicScript'), 'bold');
    assert.equal(paints, 4);
});

test('saved text sizes still apply and every entry page restores the language before first paint', () => {
    const { properties, values, run } = reader();
    values.set('textSize', 'largest');
    run('initTextSize()');
    assert.equal(properties.get('--reading-scale'), '1.26');
    for (const file of ['index.html', 'bookmarks.html', 'about.html', 'contact.html', 'privacy.html', 'licenses.html', 'whats-new.html']) {
        const script = read(file).match(/<script>([\s\S]*?)<\/script>/)[1];
        for (const value of ['ar', 'en', 'garbage', null]) {
            const document = { documentElement: { dataset: {}, classList: { add() {} } } };
            vm.runInNewContext(script, { document, localStorage: { getItem: key => key === 'readingLanguage' ? value : null }, window: {} });
            assert.equal(document.documentElement.dataset.readingLanguage, value === 'ar' ? 'ar' : 'en', file);
        }
    }
});

test('language changes fade the existing narration and reference in place and respect reduced motion', () => {
    const { context, faded, run } = reader();
    context.paintReadingLanguage = () => {};
    run("current = { key: 'urn:10' }; setReadingLanguage('ar')");
    for (const element of faded) {
        assert.equal(element.options.duration, 650);
        assert.equal(element.frames[0].opacity, 0.35);
        assert.equal(element.frames[1].opacity, 1);
    }
    const previous = faded.map(element => element.animation);
    run("setReadingLanguage('en')");
    assert.ok(previous.every(animation => animation.cancelled));
    const latest = faded.map(element => element.animation);
    context.matchMedia = () => ({ matches: true });
    run("setReadingLanguage('ar')");
    assert.ok(faded.every((element, index) => element.animation === latest[index]));
    assert.equal(run('current.key'), 'urn:10');
});
