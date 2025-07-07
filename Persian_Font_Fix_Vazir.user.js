// ==UserScript==
// @name         Persian Font Fix (Vazir)
// @namespace    https://github.com/sinazadeh/userscripts
// @version      2.0.32
// @description  Improves the readability of Persian and RTL content by applying the Vazir font across supported websites.
// @author       TheSina
// @match       *://*.telegram.org/*
// @match       *://*.x.com/*
// @match       *://*.twitter.com/*
// @match       *://*.instagram.com/*
// @match       *://*.facebook.com/*
// @match       *://*.whatsapp.com/*
// @match       *://*.github.com/*
// @match       *://*.youtube.com/*
// @match       *://*.soundcloud.com/*
// @match       *://www.google.com/*
// @match       *://gemini.google.com/*
// @match       *://translate.google.com/*
// @match       *://*.chatgpt.com/*
// @match       *://*.openai.com/*
// @match       *://fa.wikipedia.org/*
// @match       *://app.slack.com/*
// @match       *://*.goodreads.com/*
// @match       *://*.reddit.com/*
// @exclude      *://*.google.*/recaptcha/*
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Persian_Font_Fix_Vazir.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Persian_Font_Fix_Vazir_meta.user.js
// ==/UserScript==
/* jshint esversion: 6 */
/* global requestIdleCallback */
(function () {
    'use strict';

    // --- 0. Inject font regardless of performance tweaks ---
    GM_addStyle(`
        @font-face {
            font-family: 'VazirmatnFixed';
            src: local('Vazirmatn');
            font-display: swap;
            unicode-range:
                U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        body,
        p,
        div,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        a,
        li,
        td,
        th,
        input[type='text'],
        input[type='search'],
        textarea,
        select,
        option,
        label,
        button,
        blockquote,
        summary,
        details,
        figcaption,
        strong,
        em,
        span[lang^='fa'],
        span[lang^='ar'],
        span[dir='rtl'] {
            font-family:
                'VazirmatnFixed', 'Noto Sans', 'Apple Color Emoji', 'Noto Color Emoji',
                'Twemoji Mozilla', 'Google Sans', 'Helvetica Neue', sans-serif !important;
        }
        html {
            font-size: 16px;
        }
        `);

    // --- 1. Only look for the two characters we actually replace ---
    const replacementRegex = /[يك]/g;
    const charMap = new Map([
        ['ي', 'ی'],
        ['ك', 'ک'],
    ]);

    const fixText = text =>
        text.replace(replacementRegex, c => charMap.get(c) || c);

    // --- 2. Fast node‐by‐node replacement, only when needed ---
    const processed = new WeakSet();
    const walkerFilter = {
        acceptNode(node) {
            // only walk TEXT nodes that contain at least one replaceable char
            return replacementRegex.test(node.nodeValue)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP;
        },
    };

    function fixNode(root) {
        if (processed.has(root) || !replacementRegex.test(root.textContent))
            return;
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            walkerFilter,
            false,
        );
        let node,
            changed = false;
        while ((node = walker.nextNode())) {
            const orig = node.nodeValue;
            const upd = fixText(orig);
            if (orig !== upd) {
                node.nodeValue = upd;
                changed = true;
            }
        }
        if (changed) processed.add(root);
    }

    // --- 3. Input elements: per-element debounce, no full re-scans ---
    function attachInput(el) {
        if (el.dataset.pfixAttached) return;
        el.dataset.pfixAttached = '1';

        const doFix = () => {
            if (!replacementRegex.test(el.value)) return;
            const orig = el.value;
            const upd = fixText(orig);
            if (orig === upd) return;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            el.value = upd;

            if (start != null && end != null) {
                try {
                    el.setSelectionRange(start, end);
                } catch (err) {
                    // Ignore
                }
            }
        };

        let to;
        el.addEventListener('input', () => {
            clearTimeout(to);
            to = setTimeout(doFix, 50);
        });

        // Initial fix
        doFix();
    }

    // --- 4. Throttled, targeted MutationObserver ---
    let pending = new Set(),
        ticking = false;

    function schedule() {
        if (ticking) return;
        ticking = true;
        // run on idle if available
        const exec = () => {
            pending.forEach(node => {
                if (
                    node.nodeType === Node.TEXT_NODE ||
                    node.nodeType === Node.ELEMENT_NODE
                )
                    fixNode(node.nodeType === 1 ? node : node.parentElement);
            });
            pending.clear();
            ticking = false;
        };
        if ('requestIdleCallback' in window)
            requestIdleCallback(exec, {
                timeout: 200,
            });
        else setTimeout(exec, 100);
    }

    const obs = new MutationObserver(muts => {
        muts.forEach(m => {
            if (
                m.type === 'characterData' &&
                replacementRegex.test(m.target.nodeValue)
            ) {
                pending.add(m.target);
            }
            if (m.type === 'childList') {
                m.addedNodes.forEach(n => {
                    if (n.nodeType === 3) {
                        // text node
                        if (replacementRegex.test(n.nodeValue)) pending.add(n);
                    } else if (n.nodeType === 1) {
                        // element
                        // if it has replaceable text somewhere in subtree
                        if (replacementRegex.test(n.textContent))
                            pending.add(n);
                        // if it’s an <input> or <textarea>, attach
                        const tag = n.tagName;
                        if (tag === 'INPUT' || tag === 'TEXTAREA')
                            attachInput(n);
                        // also look for any nested inputs
                        n.querySelectorAll('input,textarea').forEach(
                            attachInput,
                        );
                    }
                });
            }
        });
        if (pending.size) schedule();
    });

    // --- 5. Initialization only after full load, so paint isn’t blocked ---
    function init() {
        // 5a. Initial sweep in idle time
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => fixNode(document.body), {
                timeout: 500,
            });
            requestIdleCallback(
                () => {
                    document
                        .querySelectorAll('input,textarea')
                        .forEach(attachInput);
                },
                {
                    timeout: 500,
                },
            );
        } else {
            setTimeout(() => fixNode(document.body), 200);
            setTimeout(() => {
                document
                    .querySelectorAll('input,textarea')
                    .forEach(attachInput);
            }, 200);
        }

        // 5b. Start observing for dynamic content
        obs.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
