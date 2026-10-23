/* ==========================================================
   bookmarks.js — folders, saved Hadiths, and the pages that
   manage them. Everything lives in localStorage; there is no
   account, no server and nothing syncs across devices.
   ========================================================== */

const BookmarkStore = (function () {
    const KEY = 'hadithBookmarks';

    function read() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY));
            if (data && Array.isArray(data.folders) && Array.isArray(data.items)) return data;
        } catch (e) { /* corrupt or missing — start fresh */ }
        return { folders: [], items: [] };
    }

    function write(data) {
        localStorage.setItem(KEY, JSON.stringify(data));
    }

    function uid(prefix) {
        return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function getFolders() {
        return read().folders.slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    function getFolder(id) {
        return read().folders.find(f => f.id === id) || null;
    }

    function findByName(name, exceptId) {
        const lower = (name || '').trim().toLowerCase();
        return read().folders.find(f => f.name.toLowerCase() === lower && f.id !== exceptId) || null;
    }

    function createFolder(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return null;

        const existing = findByName(trimmed);
        if (existing) return existing;

        const data = read();
        const folder = { id: uid('f'), name: trimmed, createdAt: Date.now() };
        data.folders.push(folder);
        write(data);
        return folder;
    }

    function renameFolder(id, name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return;

        const data = read();
        const folder = data.folders.find(f => f.id === id);
        if (folder) { folder.name = trimmed; write(data); }
    }

    function deleteFolder(id) {
        const data = read();
        data.folders = data.folders.filter(f => f.id !== id);
        data.items = data.items.filter(i => i.folderId !== id);
        write(data);
    }

    function getItems(folderId) {
        return read().items
            .filter(i => i.folderId === folderId)
            .sort((a, b) => b.savedAt - a.savedAt);
    }

    function folderIdsFor(key) {
        return read().items.filter(i => i.key === key).map(i => i.folderId);
    }

    function isSaved(key) {
        return folderIdsFor(key).length > 0;
    }

    function snapshot(hadith) {
        return {
            key: hadith.key,
            collection: hadith.collection || '',
            ref: hadith.ref,
            collectionTitle: hadith.collectionTitle,
            book: hadith.book != null ? hadith.book : null,
            inBook: hadith.inBook != null ? hadith.inBook : null,
            chapter: hadith.chapter || '',
            english: hadith.english,
            arabic: hadith.arabic || '',
            narrator: hadith.narrator || '',
            grades: hadith.grades || [],
            primary: hadith.primary || null,
            sunnahUrl: hadith.sunnahUrl || null
        };
    }

    /** Saves the Hadith into the folder unless it's already there. Returns true when added. */
    function add(folderId, hadith) {
        const data = read();
        if (data.items.some(i => i.folderId === folderId && i.key === hadith.key)) return false;

        data.items.push(Object.assign({ id: uid('b'), folderId }, snapshot(hadith), { savedAt: Date.now() }));
        write(data);
        return true;
    }

    /** Adds the Hadith to the folder, or removes it if it's already there. Returns the new saved state. */
    function toggle(folderId, hadith) {
        const data = read();
        const existing = data.items.find(i => i.folderId === folderId && i.key === hadith.key);

        if (existing) {
            data.items = data.items.filter(i => i !== existing);
            write(data);
            return false;
        }

        return add(folderId, hadith);
    }

    function removeItem(itemId) {
        const data = read();
        data.items = data.items.filter(i => i.id !== itemId);
        write(data);
    }

    /** Moves a saved Hadith to another folder; if it's already there, this copy just goes. */
    function moveItem(itemId, folderId) {
        const data = read();
        const item = data.items.find(i => i.id === itemId);
        if (!item) return;
        if (data.items.some(i => i.folderId === folderId && i.key === item.key)) {
            data.items = data.items.filter(i => i !== item);
        } else {
            item.folderId = folderId;
        }
        write(data);
    }

    function countIn(folderId) {
        return read().items.filter(i => i.folderId === folderId).length;
    }

    return {
        getFolders, getFolder, findByName, createFolder, renameFolder, deleteFolder,
        getItems, folderIdsFor, isSaved, add, toggle, removeItem, moveItem, countIn
    };
})();

function hadithKey(h) {
    return `${h.collection}:${h.ref}`;
}

/**
 * A saved item in the shape the card and copy code use. Bookmarks saved before
 * the dataset migration have `book`/`number`/`status` in place of
 * `collectionTitle`/`ref`/`primary`; render whatever is there, rewrite nothing.
 */
function savedToHadith(item) {
    const numeric = item.collectionTitle != null;
    return {
        key: item.key,
        collection: item.collection || '',
        collectionTitle: item.collectionTitle || item.book || '',
        ref: item.ref != null ? item.ref : item.number,
        book: numeric ? item.book : null,
        inBook: numeric ? item.inBook : null,
        chapter: item.chapter || '',
        english: item.english || '',
        arabic: item.arabic || '',
        // Older saves carried a presentational "— " before the narrator.
        narrator: (item.narrator || '').replace(/^—\s*/, ''),
        grades: item.grades || [],
        primary: item.primary || (item.status ? { grade: item.status, cat: 'unknown' } : null),
        sunnahUrl: item.sunnahUrl || null
    };
}

const plural = (n, noun) => n === 1 ? `1 ${noun}` : `${n} ${noun}s`;

const ICONS = {
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5.5" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="12" cy="18.5" r="1.7"></circle></svg>',
    chevron: '<svg class="list-row-trail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"></path></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11a1 1 0 0 1 1 1v13.6a.5.5 0 0 1-.77.42L12 15.4l-5.73 3.62a.5.5 0 0 1-.77-.42V5.5a1 1 0 0 1 1-1z"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"></path></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5.5M11 5.5L4.5 12l6.5 6.5"></path></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5v11.5"></path><path d="M8 7.5L12 3.5l4 4"></path><path d="M5 13.5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"></path></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"></rect><path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v.5"></path></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"></path></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4.5h5.5V10M19.5 4.5L11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"></path></svg>'
};

function folderNameProblem(name, exceptId) {
    if (!name) return 'Enter a folder name.';
    const existing = BookmarkStore.findByName(name, exceptId);
    return existing ? `A folder named "${existing.name}" already exists.` : null;
}

/* ==========================================================
   Save sheet — the "Save" button on the Read page. Absent on
   every other page, so this block quietly does nothing there.
   ========================================================== */

(function () {
    const saveBtn = document.getElementById('save-btn');
    const saveLabel = document.getElementById('save-label');
    const sheet = document.getElementById('save-modal');
    if (!saveBtn || !sheet) return;

    const folderListEl = document.getElementById('save-folder-list');
    const newFolderForm = document.getElementById('new-folder-form');
    const newFolderInput = document.getElementById('new-folder-name');
    const doneBtn = document.getElementById('save-done');

    function refreshSaveButton(hadith) {
        const saved = hadith ? BookmarkStore.isSaved(hadithKey(hadith)) : false;
        saveBtn.classList.toggle('is-saved', saved);
        saveBtn.setAttribute('aria-pressed', String(saved));
        if (saveLabel) saveLabel.textContent = saved ? 'Saved' : 'Save';
    }

    function renderFolderList() {
        const key = current ? hadithKey(current) : null;
        const savedIn = key ? BookmarkStore.folderIdsFor(key) : [];
        const folders = BookmarkStore.getFolders();

        folderListEl.innerHTML = '';

        if (!folders.length) {
            const p = document.createElement('p');
            p.className = 'folder-list-empty';
            p.textContent = 'No folders yet. Create one below.';
            folderListEl.appendChild(p);
            return;
        }

        folders.forEach(folder => {
            const isChecked = savedIn.includes(folder.id);

            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'folder-row';
            row.setAttribute('aria-pressed', String(isChecked));

            row.innerHTML =
                '<span class="folder-row-check" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>' +
                '</span>' +
                '<span class="folder-row-name"></span>' +
                '<span class="folder-row-count"></span>';

            row.querySelector('.folder-row-name').textContent = folder.name;
            row.querySelector('.folder-row-count').textContent = BookmarkStore.countIn(folder.id);

            row.addEventListener('click', () => {
                if (!current) return;
                BookmarkStore.toggle(folder.id, current);
                renderFolderList();
                refreshSaveButton(current);
                toast(isChecked ? 'Removed from ' + folder.name : 'Saved to ' + folder.name);
            });

            folderListEl.appendChild(row);
        });
    }

    saveBtn.addEventListener('click', () => {
        if (!current) return;
        renderFolderList();
        openSheet(sheet, saveBtn);
    });

    if (doneBtn) doneBtn.addEventListener('click', () => closeSheet(sheet));

    if (newFolderForm) {
        newFolderForm.addEventListener('submit', e => {
            e.preventDefault();
            const name = newFolderInput.value.trim();
            if (!name) return;

            const existed = BookmarkStore.findByName(name);
            const folder = BookmarkStore.createFolder(name);
            newFolderInput.value = '';

            if (current) {
                BookmarkStore.add(folder.id, current);
                refreshSaveButton(current);
            }

            renderFolderList();
            toast(existed ? 'Saved to ' + folder.name : 'Saved to new folder "' + folder.name + '"');
        });
    }

    // script.js calls this once a narration finishes rendering. Defined as an
    // optional hook there so it works whether or not this file is present.
    window.onHadithDisplayed = function (hadith) {
        refreshSaveButton(hadith);
    };
})();

/* ==========================================================
   Library export / import — the same "Hadith Pull library"
   .html file the Android app writes and reads: readable in any
   browser, re-importable through its embedded JSON. The site
   writes format version 2 (URN keys, with older saved keys preserved).
   ========================================================== */

const Library = (function () {
    const FORMAT = 'hadith-pull-library';
    const VERSION = 2;
    const NEWEST_KNOWN = 2;
    const MAX_BYTES = 10 * 1024 * 1024;
    const MAX_FOLDERS = 200;
    const MAX_ITEMS = 5000;

    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    function build(folderIds) {
        const folders = BookmarkStore.getFolders().filter(f => !folderIds || folderIds.includes(f.id));
        const withItems = folders.map(f => ({ folder: f, items: BookmarkStore.getItems(f.id) }));

        const doc = {
            format: FORMAT,
            version: VERSION,
            exportedAt: Date.now(),
            folders: withItems.map(({ folder, items }) => ({
                name: folder.name,
                items: items.filter(i => i.key).map(i => ({ key: i.key }))
            }))
        };

        const body = withItems.map(({ folder, items }) =>
            '<h2>' + esc(folder.name) + '</h2>\n' + items.map(item => {
                const h = savedToHadith(item);
                let ref = referenceLabel(h);
                if (h.chapter) ref += ' · ' + h.chapter;
                if (h.primary) ref += ' · ' + h.primary.grade;
                return '<article>\n' +
                    '<p class="english">' + esc(h.english) + '</p>\n' +
                    (h.arabic ? '<details><summary>Arabic</summary><p dir="rtl" lang="ar">' + esc(h.arabic) + '</p></details>\n' : '') +
                    (h.narrator ? '<p class="narrator">' + esc(h.narrator) + '</p>\n' : '') +
                    '<p class="ref">' + esc(ref) + '</p>\n' +
                    (h.sunnahUrl ? '<p><a href="' + esc(h.sunnahUrl) + '" target="_blank" rel="noopener">View on Sunnah.com &rarr;</a></p>\n' : '') +
                    '</article>\n';
            }).join('')
        ).join('');

        const title = 'Hadith Pull: your saved narrations';
        // </script> inside the embedded JSON would otherwise close the script block early.
        const json = JSON.stringify(doc).replace(/<\//g, '<\\/');

        return '<!doctype html><html><head><meta charset="utf-8">\n' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
            '<title>' + esc(title) + '</title>\n' +
            '<style>\n' +
            ':root { color-scheme: light dark; }\n' +
            "body { font-family: Georgia, 'Cormorant Garamond', serif; max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; background: #F6F2EA; color: #1C1917; }\n" +
            '@media (prefers-color-scheme: dark) { body { background: #0A0F14; color: #ECE9E4; } a { color: #5EEAD4; } }\n' +
            'h1 { font-weight: 500; } h2 { font-size: 1.1rem; opacity: 0.7; margin-top: 2.5rem; border-bottom: 1px solid currentColor; padding-bottom: 0.4rem; }\n' +
            'input#search { width: 100%; box-sizing: border-box; font-size: 1rem; padding: 10px 14px; margin: 16px 0; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; }\n' +
            'article { margin: 1.4rem 0; padding-bottom: 1.4rem; border-bottom: 1px solid rgba(128,128,128,0.25); }\n' +
            '.ref { font-family: sans-serif; font-size: 0.85rem; opacity: 0.65; }\n' +
            '.narrator { font-style: italic; opacity: 0.8; }\n' +
            'article[hidden] { display: none; }\n' +
            '</style></head>\n<body>\n' +
            '<h1>' + esc(title) + '</h1>\n' +
            '<input id="search" type="search" placeholder="Search your saved narrations…">\n' +
            body +
            '<script type="application/json" id="hadith-pull-library">' + json + '</script>\n' +
            '<script>\n(function() {\n' +
            "  var input = document.getElementById('search');\n" +
            "  var articles = Array.prototype.slice.call(document.querySelectorAll('article'));\n" +
            "  input.addEventListener('input', function() {\n" +
            '    var q = input.value.trim().toLowerCase();\n' +
            '    articles.forEach(function(a) { a.hidden = q.length > 0 && a.textContent.toLowerCase().indexOf(q) === -1; });\n' +
            '  });\n})();\n</script>\n</body></html>';
    }

    function fileName() {
        return 'hadith-pull-library-' + new Date().toISOString().slice(0, 10) + '.html';
    }

    function file(folderIds) {
        return new File([build(folderIds)], fileName(), { type: 'text/html' });
    }

    /** { ok: doc } or { error: message } */
    function parse(text, size) {
        if (size > MAX_BYTES) return { error: 'This file is too large to import.' };
        const match = /<script type="application\/json" id="hadith-pull-library">([\s\S]*?)<\/script>/.exec(text);
        if (!match) return { error: "This isn't a Hadith Pull library file." };

        let doc;
        try { doc = JSON.parse(match[1].replace(/<\\\//g, '</')); } catch (e) { doc = null; }
        if (!doc || doc.format !== FORMAT || !Array.isArray(doc.folders)) return { error: "This isn't a Hadith Pull library file." };
        if ((doc.version || 1) > NEWEST_KNOWN) return { error: 'This file was made by a newer version of Hadith Pull.' };

        const itemCount = doc.folders.reduce((n, f) => n + (Array.isArray(f.items) ? f.items.length : 0), 0);
        if (doc.folders.length > MAX_FOLDERS || itemCount > MAX_ITEMS) return { error: 'This file is too large to import.' };

        return { ok: doc, folderCount: doc.folders.length, itemCount };
    }

    /**
     * Merge rules match the app's: a folder whose name is taken gets its own renamed copy
     * ("Name (1)") unless the existing folder already holds everything being imported;
     * duplicates are skipped; nothing is deleted or overwritten. Every Hadith is resolved
     * against this site's dataset -- the file's own text is never trusted. Both URN
     * keys and mapped legacy keys resolve through the same lookup as shared links.
     */
    async function apply(doc) {
        let added = 0, alreadySaved = 0, notFound = 0;
        const touched = new Set();

        for (const folder of doc.folders) {
            const keys = (Array.isArray(folder.items) ? folder.items : []).map(i => i && String(i.key || ''));
            const resolved = [];
            for (const key of keys) {
                const found = /^[a-z0-9]+:/i.test(key) ? await findRecord(key).catch(() => null) : null;
                if (found) resolved.push(toHadith(found.record, found.collection));
                else notFound++;
            }

            const name = String(folder.name || 'Imported').trim().slice(0, 40) || 'Imported';
            let target = BookmarkStore.findByName(name);
            if (target) {
                const held = new Set(BookmarkStore.getItems(target.id).map(i => i.key));
                if (!resolved.every(h => held.has(h.key))) {
                    let n = 1;
                    while (BookmarkStore.findByName(`${name} (${n})`)) n++;
                    target = BookmarkStore.createFolder(`${name} (${n})`);
                }
            } else {
                target = BookmarkStore.createFolder(name);
            }
            touched.add(target.id);

            resolved.forEach(h => { BookmarkStore.add(target.id, h) ? added++ : alreadySaved++; });
        }

        return { added, alreadySaved, notFound, foldersTouched: touched.size };
    }

    return { file, parse, apply };
})();

/* ==========================================================
   Bookmarks page — folder list, folder detail. Absent
   everywhere but bookmarks.html.
   ========================================================== */

(function () {
    const root = document.getElementById('bookmarks-root');
    if (!root) return;

    const hero = document.getElementById('bookmarks-hero');

    function formattedDate(ts) {
        return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function excerpt(text, limit) {
        if (!text || text.length <= limit) return text || '';
        const cut = text.slice(0, limit);
        const lastSpace = cut.lastIndexOf(' ');
        return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '') + '…';
    }

    function currentFolderId() {
        return decodeURIComponent(location.hash.replace(/^#/, '')) || null;
    }

    function render() {
        closeMenu();
        const folderId = currentFolderId();
        const folder = folderId ? BookmarkStore.getFolder(folderId) : null;

        if (hero) hero.hidden = Boolean(folder);
        if (folder) renderDetail(folder);
        else renderFolders();
    }

    function el(tag, className, html) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (html) node.innerHTML = html;
        return node;
    }

    /* ---------- folder actions, shared by the list and the detail view ---------- */

    async function renameFolder(folder) {
        const name = await askDialog({
            title: 'Rename folder',
            input: { value: folder.name, placeholder: 'Folder name' },
            confirmLabel: 'Rename',
            validate: value => value ? (BookmarkStore.findByName(value, folder.id) ? 'Another folder already has that name.' : null) : 'Enter a folder name.'
        });
        if (name) { BookmarkStore.renameFolder(folder.id, name); render(); }
    }

    async function deleteFolder(folder, onDone) {
        const count = BookmarkStore.countIn(folder.id);
        const ok = await askDialog({
            title: `Delete "${folder.name}"?`,
            body: count ? `This removes the folder and the ${plural(count, 'Hadith')} saved in it.` : 'This folder is empty.',
            confirmLabel: 'Delete',
            danger: true
        });
        if (!ok) return;
        BookmarkStore.deleteFolder(folder.id);
        toast('Folder deleted');
        onDone ? onDone() : render();
    }

    async function sendLibrary(folderIds, title) {
        const f = Library.file(folderIds);
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
            try { await navigator.share({ files: [f], title }); } catch (e) { /* dismissed */ }
        } else {
            downloadBlob(f, f.name);
            toast(folderIds ? 'Folder exported' : 'Library exported');
        }
    }

    function folderMenu(anchor, folder, onDeleted) {
        openMenu(anchor, {
            items: [
                { label: 'Share folder', onSelect: () => sendLibrary([folder.id], 'Share ' + folder.name) },
                { label: 'Export folder', onSelect: () => { const f = Library.file([folder.id]); downloadBlob(f, f.name); toast('Folder exported'); } },
                { label: 'Rename', onSelect: () => renameFolder(folder) },
                'sep',
                { label: 'Delete', danger: true, onSelect: () => deleteFolder(folder, onDeleted) }
            ]
        });
    }

    /* ---------- folder list ---------- */

    function renderFolders() {
        const folders = BookmarkStore.getFolders();
        root.innerHTML = '';

        const section = el('section', 'section');
        const head = el('div', 'section-head', '<h2 class="section-title">Folders</h2>');
        const addBtn = el('button', 'add-btn', ICONS.plus + 'New folder');
        addBtn.type = 'button';
        head.appendChild(addBtn);
        section.appendChild(head);

        const form = el('form', 'inline-form',
            '<input type="text" placeholder="New folder name…" maxlength="40" autocomplete="off" aria-label="New folder name">' +
            '<button class="btn btn-primary" type="submit">Create</button>');
        form.hidden = true;
        const formError = el('p', 'modal-error');
        formError.hidden = true;
        section.appendChild(form);
        section.appendChild(formError);

        addBtn.addEventListener('click', () => {
            form.hidden = !form.hidden;
            formError.hidden = true;
            if (!form.hidden) form.querySelector('input').focus();
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            const input = form.querySelector('input');
            const problem = folderNameProblem(input.value.trim());
            if (problem) { formError.textContent = problem; formError.hidden = false; return; }
            const folder = BookmarkStore.createFolder(input.value);
            render();
            toast('Folder "' + folder.name + '" created');
        });

        if (!folders.length) {
            section.appendChild(el('div', 'empty-state',
                '<strong>No folders yet</strong>' +
                '<p>Folders are created when you save a Hadith or tap New folder.</p>' +
                '<a class="btn btn-primary" href="./">Read a Hadith</a>'));
        } else {
            const list = el('div', 'grouped');
            folders.forEach(folder => {
                const count = BookmarkStore.countIn(folder.id);
                const row = el('a', 'list-row',
                    '<span class="folder-tile">' + ICONS.bookmark + '</span>' +
                    '<span class="list-row-text"><span class="list-row-title"></span><span class="list-row-sub"></span></span>' +
                    '<button type="button" class="icon-btn row-menu-btn" aria-label="Folder options" aria-haspopup="menu">' + ICONS.more + '</button>' +
                    ICONS.chevron);
                row.href = '#' + encodeURIComponent(folder.id);
                row.querySelector('.list-row-title').textContent = folder.name;
                row.querySelector('.list-row-sub').textContent = plural(count, 'Hadith');

                const menuBtn = row.querySelector('.row-menu-btn');
                menuBtn.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    folderMenu(menuBtn, folder);
                });
                list.appendChild(row);
            });
            section.appendChild(list);
        }

        root.appendChild(section);
        root.appendChild(renderBackup(folders));
    }

    /* ---------- backup ---------- */

    function renderBackup(folders) {
        const section = el('section', 'section',
            '<div class="section-head"><h2 class="section-title">Backup</h2></div>' +
            '<p class="section-lede">Keep a copy of your bookmarks, or move them to another device or the Android app.</p>');

        const list = el('div', 'grouped');
        const rows = [
            ['Export Library', 'Save a readable copy you can import later', () => chooseScope('export')],
            ['Share Library', 'Share your full library or selected folders', () => chooseScope('share')],
            ['Import Library', 'Add folders from a Hadith Pull file', () => picker.click()]
        ];

        rows.forEach(([title, sub, action]) => {
            const row = el('button', 'list-row',
                '<span class="list-row-text"><span class="list-row-title"></span><span class="list-row-sub"></span></span>' + ICONS.chevron);
            row.type = 'button';
            row.querySelector('.list-row-title').textContent = title;
            row.querySelector('.list-row-sub').textContent = sub;
            row.addEventListener('click', action);
            list.appendChild(row);
        });

        const picker = el('input');
        picker.type = 'file';
        picker.accept = '.html,text/html';
        picker.hidden = true;
        picker.addEventListener('change', () => {
            const f = picker.files && picker.files[0];
            picker.value = '';
            if (f) importFile(f);
        });

        section.appendChild(list);
        section.appendChild(picker);

        function chooseScope(action) {
            if (!folders.length) { toast('No bookmarks to export yet.'); return; }
            const verb = action === 'export' ? 'Export' : 'Share';
            const run = ids => {
                if (action === 'share') return sendLibrary(ids, ids ? 'Share selected folders' : 'Share your full library');
                const f = Library.file(ids);
                downloadBlob(f, f.name);
                toast(ids ? 'Folders exported' : 'Library exported');
            };

            const sheet = scopeSheet(verb + ' Library',
                action === 'export' ? 'Save a file you can keep or import later.' : 'Send your bookmarks to someone, or to another device.');
            const total = folders.reduce((n, f) => n + BookmarkStore.countIn(f.id), 0);

            sheet.addOption('Full library', `${plural(folders.length, 'folder')} · ${plural(total, 'Hadith')}`, () => run(null));
            sheet.addOption('Choose folders', 'Pick which folders to include', () => folderPicker(verb, run));
            sheet.open();
        }

        return section;
    }

    /** A small sheet of bordered choice cards. */
    function scopeSheet(title, lede) {
        const sheet = el('div', 'modal',
            '<div class="modal-panel modal-panel-sm">' +
                '<div class="sheet-handle" aria-hidden="true"></div>' +
                '<div class="modal-head"><div><h2></h2><p></p></div>' +
                '<button class="icon-btn modal-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></div>' +
                '<div class="folder-list" style="max-height:none"></div>' +
            '</div>');
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.querySelector('h2').textContent = title;
        sheet.querySelector('.modal-head p').textContent = lede;
        const body = sheet.querySelector('.folder-list');

        sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(sheet); });
        sheet.querySelector('.modal-close').addEventListener('click', () => closeSheet(sheet));
        sheet.onClosed = () => setTimeout(() => sheet.remove(), 400);

        return {
            sheet,
            body,
            addOption(label, sub, onPick) {
                const b = el('button', 'list-row folder-row',
                    '<span class="list-row-text"><span class="list-row-title"></span><span class="list-row-sub"></span></span>' + ICONS.chevron);
                b.type = 'button';
                b.querySelector('.list-row-title').textContent = label;
                b.querySelector('.list-row-sub').textContent = sub;
                b.addEventListener('click', () => { closeSheet(sheet); onPick(); });
                body.appendChild(b);
            },
            open() {
                document.body.appendChild(sheet);
                void sheet.offsetWidth;
                openSheet(sheet);
            }
        };
    }

    function folderPicker(verb, run) {
        const s = scopeSheet('Choose folders', 'Only selected folders will be included.');
        const chosen = new Set();
        const go = el('button', 'btn btn-primary btn-block');
        go.type = 'button';
        go.disabled = true;
        go.textContent = 'Select folders';
        go.style.marginTop = '16px';

        BookmarkStore.getFolders().forEach(folder => {
            const row = el('button', 'folder-row',
                '<span class="folder-row-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg></span>' +
                '<span class="folder-row-name"></span><span class="folder-row-count"></span>');
            row.type = 'button';
            row.setAttribute('aria-pressed', 'false');
            row.querySelector('.folder-row-name').textContent = folder.name;
            row.querySelector('.folder-row-count').textContent = plural(BookmarkStore.countIn(folder.id), 'Hadith');
            row.addEventListener('click', () => {
                chosen.has(folder.id) ? chosen.delete(folder.id) : chosen.add(folder.id);
                row.setAttribute('aria-pressed', String(chosen.has(folder.id)));
                go.disabled = !chosen.size;
                go.textContent = chosen.size ? `${verb} ${plural(chosen.size, 'folder')}` : 'Select folders';
            });
            s.body.appendChild(row);
        });

        go.addEventListener('click', () => { closeSheet(s.sheet); run([...chosen]); });
        s.body.parentNode.appendChild(go);
        s.open();
    }

    async function importFile(f) {
        const parsed = Library.parse(await f.text(), f.size);
        if (parsed.error) { toast(parsed.error); return; }
        if (!parsed.itemCount) {
            await askDialog({ title: 'Nothing to import', body: "This file doesn't contain any saved Hadiths.", confirmLabel: 'OK' });
            return;
        }

        const ok = await askDialog({
            title: 'Import this library?',
            body: `${plural(parsed.folderCount, 'folder')}, ${plural(parsed.itemCount, 'Hadith')}.`,
            confirmLabel: 'Import'
        });
        if (!ok) return;

        toast('Importing…');
        const s = await Library.apply(parsed.ok);
        render();

        let message = `Added ${plural(s.added, 'Hadith')} to ${plural(s.foldersTouched, 'folder')}.`;
        if (s.alreadySaved) message += ` ${s.alreadySaved} ${s.alreadySaved === 1 ? 'was' : 'were'} already saved.`;
        if (s.notFound) message += ` ${s.notFound} couldn't be found on this site.`;
        await askDialog({ title: 'Import complete', body: message, confirmLabel: 'OK' });
    }

    /* ---------- folder detail ---------- */

    function renderDetail(folder) {
        root.innerHTML = '';
        const items = BookmarkStore.getItems(folder.id);

        const bar = el('div', 'detail-bar',
            '<a class="icon-btn" href="#" aria-label="All folders" title="All folders">' + ICONS.back + '</a>' +
            '<span class="spacer"></span>' +
            '<button type="button" class="icon-btn" data-act="share" aria-label="Share folder" title="Share folder">' + ICONS.share + '</button>' +
            '<button type="button" class="icon-btn" data-act="more" aria-label="Folder options" aria-haspopup="menu">' + ICONS.more + '</button>');
        bar.querySelector('[data-act="share"]').addEventListener('click', () => sendLibrary([folder.id], 'Share ' + folder.name));
        const more = bar.querySelector('[data-act="more"]');
        more.addEventListener('click', () => folderMenu(more, folder, () => { location.hash = ''; }));
        root.appendChild(bar);

        const head = el('div', 'detail-head', '<span class="eyebrow-accent">Folder</span><h1></h1><p></p>');
        head.querySelector('h1').textContent = folder.name;
        head.querySelector('p').textContent = plural(items.length, 'Hadith');
        root.appendChild(head);

        if (!items.length) {
            const empty = el('div', 'empty-state', '<strong>Nothing saved here yet.</strong><p>Tap Save under any Hadith to add it here.</p><a class="btn btn-primary" href="./">Read a Hadith</a>');
            empty.style.marginTop = '24px';
            root.appendChild(empty);
            return;
        }

        const list = el('div', 'saved-list');
        items.forEach((item, i) => {
            const card = renderItem(item, folder);
            card.style.animationDelay = Math.min(i, 6) * 50 + 'ms';
            list.appendChild(card);
        });
        root.appendChild(list);
    }

    function renderItem(item, folder) {
        const h = savedToHadith(item);
        const card = el('article', 'saved-card');

        const short = excerpt(h.english, 320);
        const canExpand = short !== h.english || Boolean(h.arabic);

        card.innerHTML =
            '<div class="ref-card-row"><span class="ref-card-main"></span><span class="status"></span></div>' +
            '<div class="ref-card-row ref-card-sub"><span class="ref-card-chapter"></span>' +
                (h.sunnahUrl ? '<a class="sunnah-link" target="_blank" rel="noopener">View on Sunnah.com' + ICONS.external + '</a>' : '') +
            '</div>' +
            (h.arabic ? '<div class="saved-arabic" dir="rtl" lang="ar" hidden></div>' : '') +
            '<div class="saved-english"></div>' +
            (h.narrator ? '<p class="saved-narrator"></p>' : '') +
            '<ul class="saved-grades" hidden></ul>' +
            '<p class="saved-date"></p>' +
            '<div class="saved-actions">' +
                (canExpand ? '<button type="button" class="btn-quiet" data-act="expand" aria-expanded="false">' + ICONS.down + '<span>Show full</span></button>' : '') +
                '<button type="button" class="btn-quiet" data-act="copy">' + ICONS.copy + '<span>Copy</span></button>' +
                '<button type="button" class="btn-quiet" data-act="share">' + ICONS.share + 'Share</button>' +
                '<button type="button" class="icon-btn" data-act="more" aria-label="More actions" aria-haspopup="menu">' + ICONS.more + '</button>' +
            '</div>';

        card.querySelector('.ref-card-main').textContent = referenceLabel(h);
        paintStatus(card.querySelector('.status'), h.primary);
        card.querySelector('.ref-card-chapter').textContent = h.chapter;
        if (h.sunnahUrl) card.querySelector('.sunnah-link').href = h.sunnahUrl;

        const englishEl = card.querySelector('.saved-english');
        englishEl.textContent = short;
        if (h.narrator) card.querySelector('.saved-narrator').textContent = h.narrator;
        card.querySelector('.saved-date').textContent = 'Saved ' + formattedDate(item.savedAt);

        const gradesEl = card.querySelector('.saved-grades');
        gradeLines(h).forEach(line => {
            const li = document.createElement('li');
            li.textContent = line;
            gradesEl.appendChild(li);
        });

        const expandBtn = card.querySelector('[data-act="expand"]');
        if (expandBtn) {
            let expanded = false;
            expandBtn.addEventListener('click', () => {
                expanded = !expanded;
                englishEl.innerHTML = '';
                (expanded ? paragraphize(h.english) : [short]).forEach(part => {
                    const p = document.createElement('p');
                    p.textContent = part;
                    englishEl.appendChild(p);
                });

                const arabicEl = card.querySelector('.saved-arabic');
                if (arabicEl) {
                    arabicEl.hidden = !expanded;
                    if (expanded) arabicEl.textContent = h.arabic;
                }
                gradesEl.hidden = !expanded || !gradesEl.childElementCount;

                expandBtn.setAttribute('aria-expanded', String(expanded));
                expandBtn.querySelector('span').textContent = expanded ? 'Show less' : 'Show full';
            });
        }

        const copyBtn = card.querySelector('[data-act="copy"]');
        let copiedTimer = null;
        copyBtn.addEventListener('click', async () => {
            if (!(await copyHadith(h, false))) return;
            copyBtn.classList.add('is-copied');
            copyBtn.querySelector('span').textContent = 'Copied';
            clearTimeout(copiedTimer);
            copiedTimer = setTimeout(() => {
                copyBtn.classList.remove('is-copied');
                copyBtn.querySelector('span').textContent = 'Copy';
            }, 2000);
        });

        card.querySelector('[data-act="share"]').addEventListener('click', () => openCard(h));

        const more = card.querySelector('[data-act="more"]');
        more.addEventListener('click', () => {
            const others = BookmarkStore.getFolders().filter(f => f.id !== folder.id);
            openMenu(more, {
                items: [
                    { label: 'Move to…', onSelect: () => pickFolder(more, others, 'Move to a folder', target => {
                        BookmarkStore.moveItem(item.id, target.id);
                        render();
                        toast('Moved to ' + target.name);
                    }) },
                    { label: 'Also save to…', onSelect: () => pickFolder(more, others, 'Also save to', target => {
                        toast(BookmarkStore.add(target.id, h) ? 'Saved to ' + target.name : 'Already in ' + target.name);
                    }) },
                    'sep',
                    { label: 'Remove from folder', danger: true, onSelect: () => {
                        BookmarkStore.removeItem(item.id);
                        render();
                        toast('Removed from ' + folder.name);
                    } }
                ]
            });
        });

        return card;
    }

    /** Folder choice for Move/Also save: the other folders, plus a new one. */
    function pickFolder(anchor, others, title, onPick) {
        // Let the first menu finish closing before the next opens on the same anchor.
        setTimeout(() => openMenu(anchor, {
            title,
            items: others.map(f => ({ label: f.name, onSelect: () => onPick(f) })).concat(
                others.length ? ['sep'] : [],
                [{ label: 'New folder…', onSelect: async () => {
                    const name = await askDialog({
                        title: 'New folder',
                        input: { placeholder: 'New folder name…' },
                        confirmLabel: 'Create',
                        validate: value => folderNameProblem(value)
                    });
                    if (name) onPick(BookmarkStore.createFolder(name));
                } }]
            )
        }), 160);
    }

    window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
    render();
})();
