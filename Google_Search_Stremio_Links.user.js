// ==UserScript==
// @name         Google Search: Stremio Links
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.2.9
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
        bottom: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.85);
        color: #000 !important;
        font: bold 9px Noto Sans, Roboto, "Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif;
        padding: 0 2px;
        border-radius: 1px;
        pointer-events: none;
        line-height: 1;
    }
    `;

    // ——— INJECT CSS via GM_addStyle ———
    GM_addStyle(STREMIO_CSS);

    const ICON_BASE64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAAAsTAAALEwEAmpwYAAAE7mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDEgNzkuMTQ2Mjg5OSwgMjAyMy8wNi8yNS0yMDowMTo1NSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI1LjAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0wMi0xN1QyMjozNjoxOSswMjowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNS0wMi0xN1QyMjozNjoxOSswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMDItMTdUMjI6MzY6MTkrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjRhNGZmY2MwLTYwNzAtMDg0Ni05ODUzLTY1OWQxYzA5ZjAxOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo0YTRmZmNjMC02MDcwLTA4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';
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
        img.src = ICON_BASE64;
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
