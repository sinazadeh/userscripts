// ==UserScript==
// @name         Bypass Link Redirects
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.2.4
// @description  Automatically bypasses intermediate confirmation, warning, and interstitial pages on supported websites, taking you directly to the destination link.
// @author       TheSina
// @match        *://forums.socialmediagirls.com/goto/link-confirmation*
// @match        *://*.stremio.com/warning*
// @match        *://*.imagebam.com/image/*
// @match        *://*.imagebam.com/view/*
// @run-at       document-start
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Bypass_Link_Redirects.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Bypass_Link_Redirects.meta.js
// ==/UserScript==

(function () {
    const hostname = window.location.hostname;

    // Bypass SocialMediaGirls confirmation
    if (hostname.includes('socialmediagirls.com')) {
        const urlParam = new URLSearchParams(window.location.search).get('url');
        if (urlParam) {
            try {
                const decodedUrl = atob(urlParam);
                if (/^https?:\/\//i.test(decodedUrl)) {
                    window.location.replace(decodedUrl);
                }
            } catch (e) {
                console.error('Failed to decode SocialMediaGirls URL:', e);
            }
        }
    }

    // Bypass Stremio warning
    if (
        hostname.includes('stremio.com') &&
        window.location.pathname === '/warning'
    ) {
        const hash = window.location.hash;
        if (hash.startsWith('#https')) {
            try {
                const targetUrl = decodeURIComponent(hash.substring(1));
                window.location.replace(targetUrl);
            } catch (e) {
                console.error('Failed to decode Stremio URL:', e);
            }
        }
    }

    // Bypass ImageBam "Continue to your image" interstitial
    if (
        hostname.includes('imagebam.com') &&
        /^\/(image|view)\//.test(window.location.pathname)
    ) {
        // The "Continue" link only sets these cookies and reloads; setting
        // them up front skips the interstitial on later images entirely.
        const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
        document.cookie = `nsfw_inter=1; expires=${expires}; path=/`;
        document.cookie = `sfw_inter=1; expires=${expires}; path=/`;

        // Wait for the page to render
        document.addEventListener('DOMContentLoaded', () => {
            const isInterstitial = el =>
                /continue to your image/i.test(el.textContent || '');
            // 1) Click the "Continue to your image" link or button
            const btn =
                document.querySelector('[data-shown="inter"]') ||
                Array.from(document.querySelectorAll('a, button')).find(
                    isInterstitial,
                );
            if (btn) {
                btn.click();
                return;
            }
            // 2) Older variant: submit its form, but only on the
            //    interstitial itself, never on the image page.
            const form = document.querySelector('form');
            if (form && isInterstitial(document.body)) {
                form.submit();
            }
        });
    }
})();
