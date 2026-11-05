/* The existing release-note history is also the browser's unread developer notice. */
(() => {
    const release = '20261105-parity-18';
    function paint() {
        const unread = Parity.Local.get('releaseRead') !== release;
        document.querySelectorAll('a[href="whats-new"]').forEach(link => { link.classList.toggle('has-unread', unread && !link.closest('.about-foot')); link.setAttribute('aria-label', unread ? 'What’s new — unread update' : 'What’s new'); });
    }
    document.addEventListener('screenchange', e => { if (e.detail === 'whats-new') Parity.Local.set('releaseRead', release); paint(); });
    if (location.pathname.replace(/\.html$/, '').endsWith('/whats-new')) Parity.Local.set('releaseRead', release);
    paint();
})();
