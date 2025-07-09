// ==UserScript==
// @name         Amazon Filter: Sold by Amazon.com
// @namespace    https://github.com/sinazadeh/userscripts
// @version      2.0.0
// @description  Adds a persistent dropdown to Amazon search and category pages to filter products by seller (e.g., 'Sold by Amazon.com', 'All Amazon').
// @author       TheSina
// @match        *://www.amazon.com/s*
// @match        *://www.amazon.com/*/b/*
// @match        *://www.amazon.com/b/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Amazon_Filter_Sold_by_Amazoncom.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Amazon_Filter_Sold_by_Amazoncom.meta.js
// ==/UserScript==
/* jshint esversion: 8 */
(function () {
    'use strict';

    let selectedFilters = [];
    let currentUrl = location.href;
    let observer = null;
    let isInitialized = false;

    const OPTIONS = [
        'Amazon',
        'Amazon.com',
        'Amazon Resale',
        'Amazon.com Services LLC',
    ];

    const REVERSE_ID_MAP = {
        A2Q1LRYTXHYQ2K: 'Amazon',
        ATVPDKIKX0DER: 'Amazon.com',
        A2L77EE7U53NWQ: 'Amazon Resale',
        A3ODHND3J0WMC8: 'Amazon.com Services LLC',
    };

    const ID_MAP = {
        Amazon: 'A2Q1LRYTXHYQ2K',
        'Amazon.com': 'ATVPDKIKX0DER',
        'Amazon Resale': 'A2L77EE7U53NWQ',
        'Amazon.com Services LLC': 'A3ODHND3J0WMC8',
    };

    function initializeStateFromURL() {
        const url = new URL(location.href);
        const rh = url.searchParams.get('rh') || '';
        const rhParts = rh.split(',');
        const sellerFilter = rhParts.find(p => p.startsWith('p_6:'));

        if (sellerFilter) {
            // Split by either single or double-encoded pipe
            const sellerIds = sellerFilter.substring(4).split(/\||%7C/);
            selectedFilters = sellerIds
                .map(id => REVERSE_ID_MAP[id])
                .filter(Boolean);
        } else {
            selectedFilters = [];
        }
    }

    function applyFilter() {
        const originalHref = location.href;
        const url = new URL(originalHref);
        const sp = url.searchParams;

        const others = (sp.get('rh') || '')
            .split(',')
            .filter(p => p && !p.startsWith('p_6:'));

        if (selectedFilters.length > 0) {
            // Join with an encoded pipe (%7C).
            const pipeList = selectedFilters
                .map(label => ID_MAP[label])
                .join('%7C');
            others.push('p_6:' + pipeList);
            sp.set('rh', others.join(','));
        } else {
            if (others.length > 0) {
                sp.set('rh', others.join(','));
            } else {
                sp.delete('rh');
            }
        }

        const newHref = url.toString();

        if (newHref !== originalHref) {
            window.location.href = newHref;
        }
    }

    function toggleOption(label) {
        const idx = selectedFilters.indexOf(label);
        if (idx >= 0) {
            selectedFilters.splice(idx, 1);
        } else {
            selectedFilters.push(label);
        }
        updateCheckboxes();
        applyFilter();
    }

    function updateCheckboxes() {
        OPTIONS.forEach(label => {
            const mid = ID_MAP[label];
            const li = document.getElementById(`p_6/${mid}`);
            if (li) {
                const cb = li.querySelector('input[type=checkbox]');
                if (cb) {
                    cb.checked = selectedFilters.includes(label);
                }
            }
        });
    }

    function cleanupExistingElements() {
        OPTIONS.forEach(label => {
            const mid = ID_MAP[label];
            document
                .querySelectorAll(`#p_6\\/${mid}`)
                .forEach(el => el.remove());
        });
    }

    function buildNativeUI() {
        const ul = document.getElementById('filter-p_6');
        if (!ul) {
            // If the filter container doesn't exist yet, try again later
            setTimeout(buildNativeUI, 300);
            return;
        }

        // ** MODIFICATION START **
        // Find the 'Seller' filter block and move it to the top of the filter list
        const sellerBlock = ul.closest('div[aria-labelledby="p_6-title"]');
        if (sellerBlock && sellerBlock.parentElement) {
            // Move the whole "Seller" section to the top of its container
            sellerBlock.parentElement.prepend(sellerBlock);
        }
        // ** MODIFICATION END **

        // Clean up any existing elements first
        cleanupExistingElements();

        OPTIONS.slice()
            .reverse()
            .forEach(label => {
                const mid = ID_MAP[label];
                const li = document.createElement('li');
                li.id = `p_6/${mid}`;
                li.className = 'a-spacing-micro';

                li.innerHTML = `
                <span class="a-list-item">
                    <a class="a-link-normal s-navigation-item" href="#">
                        <div class="a-checkbox a-checkbox-fancy s-navigation-checkbox aok-float-left">
                            <label>
                                <input type="checkbox" name="" value="">
                                <i class="a-icon a-icon-checkbox"></i>
                                <span class="a-label a-checkbox-label"></span>
                            </label>
                        </div>
                        <span class="a-size-base a-color-base">${label}</span>
                    </a>
                </span>
            `;

                const link = li.querySelector('a');
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const cb = li.querySelector('input[type=checkbox]');
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change', {bubbles: true}));
                });

                const cb = li.querySelector('input[type=checkbox]');
                cb.addEventListener('change', () => {
                    toggleOption(label);
                });

                ul.insertBefore(li, ul.firstChild);
            });

        updateCheckboxes();
        isInitialized = true;
    }

    function checkForUrlChange() {
        if (currentUrl !== location.href) {
            currentUrl = location.href;
            isInitialized = false;
            initializeStateFromURL();
            // Wait a bit for the new page content to load
            setTimeout(() => {
                buildNativeUI();
            }, 500);
        }
    }

    function setupMutationObserver() {
        // Clean up existing observer
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(mutations => {
            let shouldReinit = false;

            mutations.forEach(mutation => {
                // Check if the URL has changed (for SPA navigation)
                if (currentUrl !== location.href) {
                    shouldReinit = true;
                    return;
                }

                // Check if the filter container was added or modified
                if (mutation.type === 'childList') {
                    const hasFilterContainer =
                        mutation.addedNodes &&
                        Array.from(mutation.addedNodes).some(
                            node =>
                                node.nodeType === 1 &&
                                (node.id === 'filter-p_6' ||
                                    node.querySelector('#filter-p_6')),
                        );

                    if (hasFilterContainer && !isInitialized) {
                        shouldReinit = true;
                    }
                }
            });

            if (shouldReinit) {
                checkForUrlChange();
            }
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function initialize() {
        initializeStateFromURL();
        buildNativeUI();
        setupMutationObserver();

        // Also check for URL changes periodically as a fallback
        setInterval(checkForUrlChange, 1000);
    }

    // Start the script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
        setTimeout(checkForUrlChange, 100);
    });
})();
