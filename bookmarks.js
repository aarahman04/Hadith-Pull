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

    function createFolder(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return null;

        const data = read();
        const existing = data.folders.find(f => f.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing;

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

    /** Adds the Hadith to the folder, or removes it if it's already there. Returns the new saved state. */
    function toggle(folderId, hadith) {
        const data = read();
        const existing = data.items.find(i => i.folderId === folderId && i.key === hadith.key);

        if (existing) {
            data.items = data.items.filter(i => i !== existing);
            write(data);
            return false;
        }

        data.items.push({
            id: uid('b'),
            folderId,
            key: hadith.key,
            slug: hadith.slug || '',
            number: hadith.number,
            book: hadith.book,
            chapter: hadith.chapter || '',
            status: hadith.status || '',
            english: hadith.english,
            arabic: hadith.arabic || '',
            narrator: hadith.narrator || '',
            savedAt: Date.now()
        });
        write(data);
        return true;
    }

    function removeItem(itemId) {
        const data = read();
        data.items = data.items.filter(i => i.id !== itemId);
        write(data);
    }

    function moveItem(itemId, folderId) {
        const data = read();
        const item = data.items.find(i => i.id === itemId);
        if (item) { item.folderId = folderId; write(data); }
    }

    function countIn(folderId) {
        return read().items.filter(i => i.folderId === folderId).length;
    }

    return {
        getFolders, getFolder, createFolder, renameFolder, deleteFolder,
        getItems, folderIdsFor, isSaved, toggle, removeItem, moveItem, countIn
    };
})();

function hadithKey(h) {
    return (h.slug || h.book || '') + '-' + h.number;
}

/* ==========================================================
   Save widget — the "Save" button and folder picker on
   index.html. Both are absent on every other page, so this
   block quietly does nothing there.
   ========================================================== */

(function () {
    const saveBtn = document.getElementById('save-btn');
    const saveLabel = document.getElementById('save-label');
    const modal = document.getElementById('save-modal');
    if (!saveBtn || !modal) return;

    const closeBtn = document.getElementById('save-modal-close');
    const folderListEl = document.getElementById('save-folder-list');
    const newFolderForm = document.getElementById('new-folder-form');
    const newFolderInput = document.getElementById('new-folder-name');

    function payload(hadith) {
        return {
            key: hadithKey(hadith),
            slug: hadith.slug,
            number: hadith.number,
            book: hadith.book,
            chapter: hadith.chapter,
            status: hadith.status,
            english: hadith.english,
            arabic: hadith.arabic,
            narrator: hadith.narrator
        };
    }

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
            p.textContent = 'No folders yet — create one below.';
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
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>' +
                '</span>' +
                '<span class="folder-row-name"></span>' +
                '<span class="folder-row-count"></span>';

            row.querySelector('.folder-row-name').textContent = folder.name;
            row.querySelector('.folder-row-count').textContent = BookmarkStore.countIn(folder.id);

            row.addEventListener('click', () => {
                if (!current) return;
                BookmarkStore.toggle(folder.id, payload(current));
                renderFolderList();
                refreshSaveButton(current);
                toast(isChecked ? 'Removed from ' + folder.name : 'Saved to ' + folder.name);
            });

            folderListEl.appendChild(row);
        });
    }

    function openModal() {
        if (!current) return;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        renderFolderList();
        if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        saveBtn.focus();
    }

    saveBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    if (newFolderForm) {
        newFolderForm.addEventListener('submit', e => {
            e.preventDefault();
            const folder = BookmarkStore.createFolder(newFolderInput.value);
            if (!folder) return;

            newFolderInput.value = '';

            if (current) {
                BookmarkStore.toggle(folder.id, payload(current));
                refreshSaveButton(current);
            }

            renderFolderList();
            toast('Folder "' + folder.name + '" created');
        });
    }

    // script.js calls this once a narration finishes rendering. Defined as an
    // optional hook there so it works whether or not this file is present.
    window.onHadithDisplayed = function (hadith) {
        refreshSaveButton(hadith);
    };
})();

/* ==========================================================
   Bookmarks page — folder grid, folder detail, and the
   share-as-card mini modal. Absent everywhere but
   bookmarks.html.
   ========================================================== */

(function () {
    const root = document.getElementById('bookmarks-root');
    if (!root) return;

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
        const folderId = currentFolderId();
        const folder = folderId ? BookmarkStore.getFolder(folderId) : null;

        if (folder) renderDetail(folder);
        else renderFolders();
    }

    function folderActionIcons() {
        return {
            rename: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"></path></svg>',
            del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"></path></svg>'
        };
    }

    function renderFolders() {
        const folders = BookmarkStore.getFolders();
        const icons = folderActionIcons();

        root.innerHTML = '';

        const form = document.createElement('form');
        form.className = 'new-folder-form new-folder-form-page';
        form.innerHTML =
            '<input type="text" placeholder="New folder name…" maxlength="40" autocomplete="off">' +
            '<button class="btn btn-ghost" type="submit">Create folder</button>';
        form.addEventListener('submit', e => {
            e.preventDefault();
            const input = form.querySelector('input');
            const folder = BookmarkStore.createFolder(input.value);
            if (folder) { input.value = ''; render(); toast('Folder "' + folder.name + '" created'); }
        });
        root.appendChild(form);

        if (!folders.length) {
            const empty = document.createElement('div');
            empty.className = 'panel bm-empty';
            empty.innerHTML =
                '<p>No folders yet. Create one above, or open a Hadith and tap <strong>Save</strong> to start your first one.</p>' +
                '<a class="btn btn-primary" href="index" style="margin-top:1rem">Read a Hadith</a>';
            root.appendChild(empty);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'folder-grid';

        folders.forEach(folder => {
            const count = BookmarkStore.countIn(folder.id);

            const card = document.createElement('div');
            card.className = 'folder-card';
            card.innerHTML =
                '<a class="folder-card-link" href="#' + encodeURIComponent(folder.id) + '">' +
                    '<span class="folder-card-name"></span>' +
                    '<span class="folder-card-count"></span>' +
                '</a>' +
                '<div class="folder-card-actions">' +
                    '<button type="button" class="icon-btn" data-action="rename" aria-label="Rename folder">' + icons.rename + '</button>' +
                    '<button type="button" class="icon-btn" data-action="delete" aria-label="Delete folder">' + icons.del + '</button>' +
                '</div>';

            card.querySelector('.folder-card-name').textContent = folder.name;
            card.querySelector('.folder-card-count').textContent = count + (count === 1 ? ' Hadith' : ' Hadiths');

            card.querySelector('[data-action="rename"]').addEventListener('click', () => {
                const name = prompt('Rename folder', folder.name);
                if (name && name.trim()) { BookmarkStore.renameFolder(folder.id, name); render(); }
            });

            card.querySelector('[data-action="delete"]').addEventListener('click', () => {
                if (confirm('Delete "' + folder.name + '" and everything saved inside it?')) {
                    BookmarkStore.deleteFolder(folder.id);
                    render();
                    toast('Folder deleted');
                }
            });

            grid.appendChild(card);
        });

        root.appendChild(grid);
    }

    function renderDetail(folder) {
        const icons = folderActionIcons();
        root.innerHTML = '';

        const items = BookmarkStore.getItems(folder.id);

        const header = document.createElement('div');
        header.className = 'bm-detail-head';
        header.innerHTML =
            '<a class="bm-back" href="#">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>' +
                'All folders' +
            '</a>' +
            '<div class="bm-detail-title">' +
                '<h2></h2>' +
                '<span class="bm-detail-count"></span>' +
            '</div>' +
            '<div class="bm-detail-actions">' +
                '<button type="button" class="icon-btn" data-action="rename" aria-label="Rename folder">' + icons.rename + '</button>' +
                '<button type="button" class="icon-btn" data-action="delete" aria-label="Delete folder">' + icons.del + '</button>' +
            '</div>';

        header.querySelector('h2').textContent = folder.name;
        header.querySelector('.bm-detail-count').textContent = items.length + (items.length === 1 ? ' Hadith' : ' Hadiths');

        header.querySelector('[data-action="rename"]').addEventListener('click', () => {
            const name = prompt('Rename folder', folder.name);
            if (name && name.trim()) { BookmarkStore.renameFolder(folder.id, name); render(); }
        });
        header.querySelector('[data-action="delete"]').addEventListener('click', () => {
            if (confirm('Delete "' + folder.name + '" and everything saved inside it?')) {
                BookmarkStore.deleteFolder(folder.id);
                toast('Folder deleted');
                location.hash = '';
            }
        });

        root.appendChild(header);

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'panel bm-empty';
            empty.innerHTML = '<p>Nothing saved here yet.</p>';
            root.appendChild(empty);
            return;
        }

        const otherFolders = BookmarkStore.getFolders().filter(f => f.id !== folder.id);
        const list = document.createElement('div');
        list.className = 'bm-item-list';

        items.forEach(item => list.appendChild(renderItem(item, folder, otherFolders)));

        root.appendChild(list);
    }

    function renderItem(item, folder, otherFolders) {
        const el = document.createElement('article');
        el.className = 'bm-item';

        const short = excerpt(item.english, 320);
        const canExpand = short !== item.english || Boolean(item.arabic);

        el.innerHTML =
            '<div class="bm-item-ref">' +
                '<span class="bm-item-ref-main"></span>' +
                '<span class="status"></span>' +
            '</div>' +
            '<div class="bm-item-english"></div>' +
            (item.arabic ? '<div class="bm-item-arabic" dir="rtl" lang="ar" hidden></div>' : '') +
            (item.narrator ? '<p class="bm-item-narrator"></p>' : '') +
            '<div class="bm-item-footer">' +
                '<span class="bm-item-date"></span>' +
                '<div class="bm-item-actions">' +
                    (canExpand ? '<button type="button" class="btn-quiet" data-action="expand">Show full</button>' : '') +
                    '<button type="button" class="btn-quiet" data-action="copy">Copy</button>' +
                    '<button type="button" class="btn-quiet" data-action="share">Share</button>' +
                    (otherFolders.length ? '<select class="bm-move-select" aria-label="Move to folder"></select>' : '') +
                    '<button type="button" class="btn-quiet bm-remove" data-action="remove">Remove</button>' +
                '</div>' +
            '</div>';

        el.querySelector('.bm-item-ref-main').textContent =
            item.book + (item.number ? '  ·  Hadith ' + item.number : '') + (item.chapter ? '  ·  ' + item.chapter : '');

        const statusEl = el.querySelector('.status');
        statusEl.textContent = item.status || 'Unclassified';
        statusEl.className = 'status ' + statusClass(item.status);

        el.querySelector('.bm-item-english').textContent = short;
        if (item.narrator) el.querySelector('.bm-item-narrator').textContent = item.narrator;
        el.querySelector('.bm-item-date').textContent = 'Saved ' + formattedDate(item.savedAt);

        const expandBtn = el.querySelector('[data-action="expand"]');
        if (expandBtn) {
            let expanded = false;
            expandBtn.addEventListener('click', () => {
                expanded = !expanded;
                el.querySelector('.bm-item-english').textContent = expanded ? item.english : short;

                const arabicEl = el.querySelector('.bm-item-arabic');
                if (arabicEl) {
                    arabicEl.hidden = !expanded;
                    if (expanded) arabicEl.textContent = item.arabic;
                }

                expandBtn.textContent = expanded ? 'Show less' : 'Show full';
            });
        }

        el.querySelector('[data-action="copy"]').addEventListener('click', async () => {
            const lines = [item.english];
            if (item.narrator) lines.push(item.narrator);
            lines.push('');
            lines.push(item.book + ', Hadith ' + item.number + (item.status ? ' (' + item.status + ')' : ''));
            if (item.chapter) lines.push('Chapter: ' + item.chapter);

            try {
                await navigator.clipboard.writeText(lines.join('\n'));
                toast('Hadith copied to clipboard');
            } catch (e) {
                toast('Copying is blocked by your browser');
            }
        });

        el.querySelector('[data-action="share"]').addEventListener('click', () => openShareModal(item));

        const moveSelect = el.querySelector('.bm-move-select');
        if (moveSelect) {
            const placeholder = document.createElement('option');
            placeholder.textContent = 'Move to…';
            placeholder.value = '';
            moveSelect.appendChild(placeholder);

            otherFolders.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name;
                moveSelect.appendChild(opt);
            });

            moveSelect.addEventListener('change', () => {
                if (!moveSelect.value) return;
                const target = otherFolders.find(f => f.id === moveSelect.value);
                BookmarkStore.moveItem(item.id, moveSelect.value);
                render();
                toast('Moved to ' + target.name);
            });
        }

        el.querySelector('[data-action="remove"]').addEventListener('click', () => {
            BookmarkStore.removeItem(item.id);
            render();
            toast('Removed from ' + folder.name);
        });

        return el;
    }

    /* ---------- share-as-card mini modal ---------- */

    function initShareModal() {
        const modal = document.getElementById('bm-card-modal');
        if (!modal || typeof HadithCard === 'undefined') return;

        const closeBtn = document.getElementById('bm-modal-close');
        const previewFrame = document.getElementById('bm-preview-frame');
        const previewImg = document.getElementById('bm-card-preview');
        const arabicBtn = document.getElementById('bm-card-arabic-btn');
        const downloadBtn = document.getElementById('bm-download-btn');
        const shareBtn = document.getElementById('bm-share-btn');
        const copyImageBtn = document.getElementById('bm-copy-image-btn');

        let theme = 'light';
        let includeArabic = true;
        let canvas = null;
        let previewUrl = null;
        let activeItem = null;

        function canvasToBlob(c) {
            return new Promise((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'));
        }

        async function build() {
            if (!activeItem) return;
            previewFrame.classList.add('is-busy');

            try {
                canvas = await HadithCard.render({
                    english: activeItem.english,
                    arabic: includeArabic ? activeItem.arabic : '',
                    narrator: activeItem.narrator,
                    book: activeItem.book,
                    number: activeItem.number,
                    status: activeItem.status,
                    site: 'hadithpull.online',
                    script: document.documentElement.getAttribute('data-arabic-script')
                }, theme);

                const blob = await canvasToBlob(canvas);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                previewUrl = URL.createObjectURL(blob);
                previewImg.src = previewUrl;
            } catch (e) {
                console.error(e);
                toast('Could not compose the card');
            } finally {
                previewFrame.classList.remove('is-busy');
            }
        }

        function fileName() {
            const book = (activeItem.book || 'hadith').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return (book + '-' + (activeItem.number || '') + '.png').replace(/-+\.png$/, '.png');
        }

        document.querySelectorAll('[data-bm-card-theme]').forEach(button => {
            button.addEventListener('click', () => {
                theme = button.dataset.bmCardTheme;
                document.querySelectorAll('[data-bm-card-theme]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
                build();
            });
        });

        if (arabicBtn) {
            arabicBtn.addEventListener('click', () => {
                includeArabic = !includeArabic;
                arabicBtn.setAttribute('aria-pressed', String(includeArabic));
                build();
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                if (!canvas) return;
                try {
                    const blob = await canvasToBlob(canvas);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName();
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 2000);
                    toast('Card saved');
                } catch (e) {
                    toast('Download failed — try long-pressing the preview');
                }
            });
        }

        if (copyImageBtn) {
            copyImageBtn.addEventListener('click', async () => {
                if (!canvas) return;
                try {
                    const blob = await canvasToBlob(canvas);
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    toast('Image copied to clipboard');
                } catch (e) {
                    toast('Your browser blocks image copying — use Download');
                }
            });
        }

        if (shareBtn && navigator.canShare && navigator.share) {
            shareBtn.hidden = false;
            shareBtn.addEventListener('click', async () => {
                if (!canvas) return;
                try {
                    const blob = await canvasToBlob(canvas);
                    const file = new File([blob], fileName(), { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'Hadith' });
                    } else {
                        toast('Sharing images is not supported here');
                    }
                } catch (e) {
                    if (e && e.name === 'AbortError') return;
                    toast('Sharing failed');
                }
            });
            if (downloadBtn) downloadBtn.classList.replace('btn-primary', 'btn-ghost');
        }

        function close() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        if (closeBtn) closeBtn.addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
        });

        window.openShareModal = function (item) {
            activeItem = item;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';

            includeArabic = true;
            if (arabicBtn) {
                arabicBtn.hidden = !item.arabic;
                arabicBtn.setAttribute('aria-pressed', 'true');
            }

            build();
        };
    }

    initShareModal();
    window.addEventListener('hashchange', render);
    render();
})();
