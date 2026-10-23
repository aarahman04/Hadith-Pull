import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('the app link sends Android to Google Play and other devices to the website', () => {
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    for (const userAgent of [
        'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
        'Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36'
    ]) {
        let destination;
        vm.runInNewContext(script, {
            navigator: { userAgent },
            location: { replace: url => { destination = url; } }
        });
        assert.equal(destination, userAgent.includes('Android')
            ? 'https://play.google.com/store/apps/details?id=online.hadithpull.app' : '/');
    }
    assert.match(html, /href="\/"/);
    assert.match(html, /href="https:\/\/play\.google\.com\/store\/apps\/details\?id=online\.hadithpull\.app"/);
});
