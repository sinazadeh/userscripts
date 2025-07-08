// ==UserScript==
// @name         Google Search: Stremio Links
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.2.7
// @description  Adds convenient "Watch on Stremio" buttons (App & Web) next to IMDb links in Google search results.
// @author       TheSina
// @match        *://www.google.*/*
// @exclude      *://*.google.*/recaptcha/*
// @grant        GM_addStyle
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
    const OBSERVE_DELAY = 200;

    // ——— OUR CSS (lives INSIDE the Shadow DOM) ———
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
        /* nothing from the page can flip us now */
        transform: none !important;
        writing-mode: horizontal-tb !important;
    }
    .stremio-btn img {
        width: 100%;
        height: 100%;
        display: block;
        transform: none !important;
    }
    .stremio-btn span {
        position: absolute;
        bottom: 0;
        right: 0;
        background: rgba(255,255,255,0.85);
        color: #000 !important;
        font: bold 9px Noto Sans, Roboto, "Segoe UI", Arial, sans-serif;
        padding: 0 2px;
        border-radius: 1px;
        pointer-events: none;
        line-height: 1;
        transform: none !important;
        writing-mode: horizontal-tb !important;
    }
    `;

    // ——— FIND IMDb LINKS ———
    function findIMDbLinks() {
        return Array.from(
            document.querySelectorAll('a[href*="imdb.com/title/tt"]'),
        ).filter(a => IMDB_URL_RX.test(a.href));
    }

    // ——— CREATE A BUTTON ELEMENT ———
    function createBtn(label, color, title, onClick) {
        const btn = document.createElement('div');
        btn.className = 'stremio-btn';
        btn.setAttribute('aria-label', title);
        btn.title = title;
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });

        const img = document.createElement('img');
        img.src = ICON_URL;
        img.alt = 'Stremio';
        btn.appendChild(img);

        const span = document.createElement('span');
        span.textContent = label;
        span.style.color = color;
        btn.appendChild(span);

        return btn;
    }

    // ——— INJECT ONE SET OF BUTTONS PER LINK… INSIDE A SHADOW HOST ———
    function addButtons() {
        for (const link of findIMDbLinks()) {
            // skip if we’ve already done this one
            if (link.parentElement.querySelector('stremio-shadow-host'))
                continue;

            const [, imdbId] = link.href.match(IMDB_URL_RX);
            const isSeries = /series|season|episode/i.test(link.href);
            const typePath = isSeries ? 'series' : 'movie';
            const appURL = `stremio://detail/${typePath}/${imdbId}`;
            const webURL = `https://web.stremio.com/#/detail/${typePath}/${imdbId}`;

            // create a custom host element
            const host = document.createElement('stremio-shadow-host');
            host.style.all = 'initial'; // wipe out any inherited CSS
            const shadow = host.attachShadow({mode: 'open'});

            // inject our CSS + buttons into the shadow root
            shadow.innerHTML = `<style>${STREMIO_CSS}</style>`;
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
            shadow.appendChild(container);

            // stick it right after the <h3> (or the link itself)
            const target = link.querySelector('h3') || link;
            target.parentElement.insertBefore(host, target.nextSibling);
        }
    }

    // ——— DEBOUNCE UTILITY ———
    let timer;
    function debounced(fn, delay = OBSERVE_DELAY) {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    }

    // ——— WATCH FOR DYNAMIC RESULTS & RUN ———
    new MutationObserver(() => debounced(addButtons)).observe(document, {
        childList: true,
        subtree: true,
    });
    window.addEventListener('load', addButtons);
    addButtons();
})();
