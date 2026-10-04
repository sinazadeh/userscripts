// ==UserScript==
// @name         GitHub Tab Avatar
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.0.3
// @description  Use each GitHub repository’s avatar as the browser tab icon.
// @author       TheSina
// @match        *://github.com/*/*
// @grant        none
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/GitHub_Tab_Avatar.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/GitHub_Tab_Avatar.meta.js
// ==/UserScript==
/* jshint esversion: 11 */
(function () {
    'use strict';

    const CACHE_TTL = 24 * 3600 * 1000;
    const STORAGE_KEY = 'githubTabAvatarCache';
    const DEBUG = false;
    const LOG = (...args) => DEBUG && console.log('[GTU]', ...args);

    let iconEls = [];
    let appliedIcon = null;
    let lastOwner = null;
    // load cache from localStorage
    let iconCache = new Map();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            JSON.parse(raw).forEach(([owner, entry]) => {
                if (Date.now() - entry.ts < CACHE_TTL) {
                    iconCache.set(owner, entry);
                }
            });
        }
    } catch {}
    let isUpdating = false;

    function getOwnerName() {
        const pathSegments = location.pathname.split('/').filter(s => s);
        // We need at least two segments to determine the owner
        if (pathSegments.length < 2) return null;

        const [segment1, segment2] = pathSegments;

        // /orgs/<org>/..., /users/<user>/projects/..., /sponsors/<user>
        if (['orgs', 'users', 'sponsors'].includes(segment1)) {
            return segment2;
        }

        // If the first segment is a known non-target, or just a user page, return null
        const nonTargetSegments = new Set([
            'settings',
            'notifications',
            'pulls',
            'issues',
            'marketplace',
            'explore',
            'organizations',
            'account',
            'topics',
            'collections',
            'trending',
            'search',
            'codespaces',
            'features',
            'enterprise',
            'apps',
            'login',
            'new',
            'security',
            'solutions',
            'resources',
            'site',
            'about',
            'pricing',
            'readme',
            'customer-stories',
            'stars',
            'watching',
            'dashboard',
        ]);
        if (nonTargetSegments.has(segment1)) {
            return null;
        }

        // Otherwise, the owner is the first segment
        return segment1;
    }

    function setFavicon(url) {
        initFaviconTags();
        appliedIcon = new URL(url, location.href).href;
        iconEls.forEach(el => {
            // GitHub declares type="image/svg+xml"; avatars are PNG/JPEG.
            el.removeAttribute('type');
            el.href = url;
        });
    }

    function resetFavicon() {
        appliedIcon = null;
        iconEls.forEach(el => {
            if (!el.isConnected || !('gtaOrigHref' in el.dataset)) return;
            el.href =
                el.dataset.gtaOrigHref || 'https://github.com/favicon.ico';
            if (el.dataset.gtaOrigType) {
                el.setAttribute('type', el.dataset.gtaOrigType);
            }
        });
    }

    function initFaviconTags() {
        if (iconEls.length && iconEls.every(el => el.isConnected)) return;
        // rel~="icon" matches "icon" and "alternate icon" but not GitHub's
        // "fluid-icon"/"mask-icon" links.
        iconEls = Array.from(document.querySelectorAll('link[rel~="icon"]'));
        if (!iconEls.length) {
            const link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
            iconEls = [link];
        }
        iconEls.forEach(el => {
            if (!('gtaOrigHref' in el.dataset)) {
                el.dataset.gtaOrigHref = el.getAttribute('href') || '';
                el.dataset.gtaOrigType = el.getAttribute('type') || '';
            }
        });
    }

    async function getAvatarFromAPI(owner) {
        // github.com/<owner>.png redirects to the avatar and is not subject
        // to the 60 requests/hour limit of the unauthenticated API.
        const fallback = `https://github.com/${owner}.png?size=32`;
        try {
            LOG('🚀 Using GitHub API to find avatar for:', owner);
            const res = await fetch(`https://api.github.com/users/${owner}`, {
                headers: {Accept: 'application/vnd.github.v3+json'},
            });
            // 404: not a user or organization (e.g. a reserved route).
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`API response ${res.status}`);
            const data = await res.json();
            if (data?.avatar_url) {
                const urlObj = new URL(data.avatar_url);
                urlObj.searchParams.set('s', '32');
                return urlObj.href;
            }
            return null;
        } catch (err) {
            LOG('⚠️ API lookup failed, using fallback:', err);
            return fallback;
        }
    }

    async function updateFavicon() {
        if (isUpdating) return;
        isUpdating = true;
        try {
            const owner = getOwnerName();
            lastOwner = owner;
            if (!owner) {
                resetFavicon();
                return;
            }
            // cached? (checked on every navigation, not only for the same
            // owner, so browsing a repo doesn't hit the rate-limited API)
            const cached = iconCache.get(owner);
            if (cached && Date.now() - cached.ts < CACHE_TTL) {
                setFavicon(cached.url);
                return;
            }

            const avatarUrl = await getAvatarFromAPI(owner);
            // Navigated elsewhere while waiting; the poll will catch up.
            if (getOwnerName() !== owner) return;
            if (avatarUrl) {
                iconCache.set(owner, {url: avatarUrl, ts: Date.now()});
                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify([...iconCache]),
                    );
                } catch {}
                setFavicon(avatarUrl);
                LOG('✅ Favicon updated successfully');
            } else {
                LOG('⚠️ No avatar found, using default');
                resetFavicon();
            }
        } finally {
            isUpdating = false;
        }
    }

    function debounce(fn, ms) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    const debouncedUpdate = debounce(updateFavicon, 300);

    function handleNavigation() {
        LOG('🧭 Navigation detected');
        debouncedUpdate();
    }

    function start() {
        LOG('🚀 Starting GitHub Tab Avatar');
        initFaviconTags();
        debouncedUpdate();

        document.addEventListener('turbo:load', handleNavigation);
        document.addEventListener('turbo:render', () =>
            setTimeout(handleNavigation, 200),
        );

        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(history, args);
            handleNavigation();
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function (...args) {
            originalReplaceState.apply(history, args);
            handleNavigation();
        };

        window.addEventListener('popstate', handleNavigation);

        setInterval(() => {
            const currentOwner = getOwnerName();
            if (currentOwner !== lastOwner) {
                LOG('🔄 Polling detected change');
                handleNavigation();
                return;
            }
            // GitHub swaps the favicon itself (Turbo head merges, CI status
            // icons on pull requests), so put the avatar back if needed.
            if (
                appliedIcon &&
                !isUpdating &&
                iconEls.some(el => !el.isConnected || el.href !== appliedIcon)
            ) {
                setFavicon(appliedIcon);
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
