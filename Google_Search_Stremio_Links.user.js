// ==UserScript==
// @name         Google Search: Stremio Links
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.2.8
// @description  Adds convenient "Watch on Stremio" buttons (App & Web) next to IMDb links in Google search results.
// @author       TheSina
// @match        *://www.google.*/*
// @exclude      *://*.google.*/recaptcha/*
// @run-at       document-end
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Google_Search_Stremio_Links.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Google_Search_Stremio_Links.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // ——— CONFIG ———
    const IMDB_URL_RX = /^https?:\/\/www\.imdb\.com\/title\/(tt\d+)\/?$/;
    const ICON_URL =
        'https://www.google.com/s2/favicons?domain=web.stremio.com&sz=64';

    const STREMIO_CSS = `
    .stremio-btns {
        margin-left: 6px;
        display: inline-flex;
        align-items: center;
    }
    .stremio-btn {
        position: relative;
        width: 20px;
        height: 20px;
        margin-right: 4px;
        cursor: pointer;
    }
    .stremio-btn img {
        width: 100%;
        height: 100%;
    }
    .stremio-btn span {
        position: absolute;
        bottom: 0px;
        right: 0px;
        background: rgba(255, 255, 255, 0.85);
        color: #000 !important;
        font: bold 9px Noto Sans, Roboto, "Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif;
        padding: 0 2px;
        border-radius: 1px;
        pointer-events: none;
        line-height: 1;
    }
    `;

    // ——— INJECT CSS ———
    const style = document.createElement('style');
    style.textContent = STREMIO_CSS;
    document.head.appendChild(style);

    // ——— CORE LOGIC ———
    function findIMDbLinks() {
        return Array.from(
            document.querySelectorAll('a[href*="imdb.com/title/tt"]'),
        ).filter(a => IMDB_URL_RX.test(a.href));
    }

    function createBtn(label, color, title, onClick) {
        const btn = document.createElement('div');
        btn.className = 'stremio-btn';
        btn.title = title;
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });

        const img = document.createElement('img');
        img.src = ICON_URL;
        btn.appendChild(img);

        const span = document.createElement('span');
        span.textContent = label;
        span.style.color = color;
        btn.appendChild(span);

        return btn;
    }

    function addButtons() {
        for (const link of findIMDbLinks()) {
            if (link.querySelector('.stremio-btns')) continue;

            const [, imdbId] = link.href.match(IMDB_URL_RX);
            const isSeries = /series|season|episode/i.test(link.textContent);
            const typePath = isSeries ? 'series' : 'movie';
            const appURL = `stremio://detail/${typePath}/${imdbId}`;
            const webURL = `https://web.stremio.com/#/detail/${typePath}/${imdbId}`;

            const container = document.createElement('span');
            container.className = 'stremio-btns';
            container.append(
                createBtn(
                    'A',
                    'blue',
                    'Open in Stremio App',
                    () => (location.href = appURL),
                ),
                createBtn('W', 'red', 'Open in Stremio Web', () =>
                    window.open(webURL, '_blank'),
                ),
            );

            (link.querySelector('h3') || link).appendChild(container);
        }
    }

    // ——— DEBOUNCE & OBSERVE ———
    let timer;
    function debounced(fn, delay = 200) {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    }

    new MutationObserver(() => debounced(addButtons)).observe(document, {
        childList: true,
        subtree: true,
    });

    window.addEventListener('load', addButtons);
    addButtons();
})();
