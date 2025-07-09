// ==UserScript==
// @name         Amazon Filter: Sold by Amazon.com
// @namespace    https://github.com/sinazadeh/userscripts
// @version      2.1.0
// @description  Enhances Amazon's sidebar by adding direct filters for items sold by Amazon.com and other Amazon-owned sellers.
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

    function isOnCategoryPage() {
        return location.pathname.includes('/b/');
    }

    function getCategoryPageData() {
        const url = new URL(location.href);
        const node = url.searchParams.get('node');

        // Try to extract category name from various sources
        let categoryName = '';

        // First try to get from search results breadcrumb (most reliable)
        const breadcrumbSpan = document.querySelector(
            '.sg-col .a-color-state.a-text-bold',
        );
        if (breadcrumbSpan) {
            categoryName = breadcrumbSpan.textContent.trim().replace(/"/g, '');
        }

        // If not found, try navigation breadcrumbs
        if (!categoryName) {
            const breadcrumbs = document.querySelector(
                '#wayfinding-breadcrumbs_feature_div',
            );
            if (breadcrumbs) {
                const links = breadcrumbs.querySelectorAll('a');
                if (links.length > 0) {
                    categoryName = links[links.length - 1].textContent.trim();
                }
            }
        }

        // If still not found, try page title but clean it properly
        if (!categoryName) {
            const title = document.title;
            if (title && title.includes('Amazon.com')) {
                categoryName = title
                    .split(' - ')[0]
                    .replace('Amazon.com: ', '')
                    .trim();
            }
        }

        // If still not found, try the main heading
        if (!categoryName) {
            const heading = document.querySelector(
                'h1, .a-size-large.a-spacing-none.a-color-base',
            );
            if (heading) {
                categoryName = heading.textContent.trim();
            }
        }

        return {
            node: node,
            categoryName: categoryName || 'Category',
        };
    }

    function buildSearchUrlFromCategory() {
        const categoryData = getCategoryPageData();
        const baseUrl = 'https://www.amazon.com/s';
        const params = new URLSearchParams();

        // Add keywords based on category name (use 'k' parameter like Amazon does)
        if (categoryData.categoryName) {
            params.set('k', categoryData.categoryName);
        }

        // Add node filter if available
        if (categoryData.node) {
            params.set('rh', `n:${categoryData.node}`);
        }

        // Add minimal necessary parameters
        params.set('ref', 'sr_nr_p_6_2');

        return `${baseUrl}?${params.toString()}`;
    }

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
        // If we're on a category page, convert to search URL first
        if (isOnCategoryPage()) {
            const searchUrl = buildSearchUrlFromCategory();
            const url = new URL(searchUrl);

            // Add seller filter if any are selected
            if (selectedFilters.length > 0) {
                const existingRh = url.searchParams.get('rh') || '';
                const rhParts = existingRh
                    .split(',')
                    .filter(p => p && !p.startsWith('p_6:'));

                const pipeList = selectedFilters
                    .map(label => ID_MAP[label])
                    .join('%7C');
                rhParts.push('p_6:' + pipeList);
                url.searchParams.set('rh', rhParts.join(','));
            }

            window.location.href = url.toString();
            return;
        }

        // Original logic for search pages
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

    function createCategoryPageUI() {
        // For category pages, create a floating widget or inject into existing sidebar
        const existingSidebar = document.querySelector(
            '#leftNav, .s-refinements, .a-section.a-spacing-none',
        );

        if (!existingSidebar) {
            // Create a floating widget if no sidebar exists
            const widget = document.createElement('div');
            widget.id = 'amazon-seller-filter-widget';
            widget.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 15px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 1000;
                max-width: 250px;
                font-family: Arial, sans-serif;
                font-size: 13px;
            `;

            const title = document.createElement('h3');
            title.textContent = 'Filter by Seller';
            title.style.cssText =
                'margin: 0 0 10px 0; font-size: 14px; font-weight: bold;';
            widget.appendChild(title);

            const ul = document.createElement('ul');
            ul.style.cssText = 'list-style: none; padding: 0; margin: 0;';
            ul.id = 'category-seller-filter';

            OPTIONS.forEach(label => {
                const li = document.createElement('li');
                li.style.cssText = 'margin: 5px 0;';

                const checkboxId = `category-${ID_MAP[label]}`;
                li.innerHTML = `
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="${checkboxId}" style="margin-right: 8px;">
                        <span>${label}</span>
                    </label>
                `;

                const checkbox = li.querySelector('input');
                checkbox.addEventListener('change', () => {
                    toggleOption(label);
                });

                ul.appendChild(li);
            });

            widget.appendChild(ul);
            document.body.appendChild(widget);

            // Update checkboxes for category page
            OPTIONS.forEach(label => {
                const checkboxId = `category-${ID_MAP[label]}`;
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) {
                    checkbox.checked = selectedFilters.includes(label);
                }
            });

            return;
        }

        // If sidebar exists, try to inject into it
        buildNativeUI();
    }

    function buildNativeUI() {
        const ul = document.getElementById('filter-p_6');
        if (!ul) {
            // If we're on a category page and no filter container exists, create custom UI
            if (isOnCategoryPage()) {
                createCategoryPageUI();
                return;
            }
            // Otherwise, try again later
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

            // Clean up any existing category widget
            const existingWidget = document.getElementById(
                'amazon-seller-filter-widget',
            );
            if (existingWidget) {
                existingWidget.remove();
            }

            initializeStateFromURL();
            // Wait a bit for the new page content to load
            setTimeout(() => {
                if (isOnCategoryPage()) {
                    createCategoryPageUI();
                } else {
                    buildNativeUI();
                }
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

        if (isOnCategoryPage()) {
            createCategoryPageUI();
        } else {
            buildNativeUI();
        }

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
