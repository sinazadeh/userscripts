// ==UserScript==
// @name         Amazon Filter: Sold by Amazon.com
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.0.0
// @description  Adds a persistent dropdown to Amazon search and category pages to filter products by seller (e.g., 'Sold by Amazon.com', 'All Amazon').
// @author       TheSina
// @match        *://www.amazon.com/s*
// @match        *://www.amazon.com/*/b/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Amazon_Filter_Sold_by_Amazoncom.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Amazon_Filter_Sold_by_Amazoncom.meta.js
// ==/UserScript==
/* jshint esversion: 11 */
(function () {
    'use strict';

    const FILTER_KEY = 'amazonMerchantFilter';
    const FILTER_OPTIONS = {
        'All Sellers': [],
        'Amazon.com': ['ATVPDKIKX0DER', 'A3ODHND3J0WMC8'],
        'All Amazon': [
            'ATVPDKIKX0DER',
            'A3ODHND3J0WMC8',
            'A2Q1LRYTXHYQ2K',
            'A2L77EE7U53NWQ',
        ],
    };

    function getCurrentFilter() {
        return localStorage.getItem(FILTER_KEY) || 'All Sellers';
    }

    function setCurrentFilter(filter) {
        localStorage.setItem(FILTER_KEY, filter);
    }

    function getMerchantId(item) {
        // Hidden input field
        const input = item.querySelector('input[name="merchantId"]');
        if (input?.value) return input.value;

        // Fallback: Parse from links
        const links = item.querySelectorAll('a[href*="/gp/"]');
        for (const link of links) {
            try {
                const url = new URL(link.href, location.origin);
                const m = url.searchParams.get('m');
                if (m) return m;
            } catch (_) {}
        }

        return null;
    }

    function filterResults() {
        const selectedFilter = getCurrentFilter();
        const allowedIds = FILTER_OPTIONS[selectedFilter];

        document
            .querySelectorAll('[data-component-type="s-search-result"]')
            .forEach(item => {
                const merchantId = getMerchantId(item);
                const match =
                    allowedIds.length === 0 ||
                    (merchantId && allowedIds.includes(merchantId));
                item.style.display = match ? '' : 'none';
            });
    }

    function createDropdown() {
        if (document.getElementById('amazon-filter-select')) return;

        const select = document.createElement('select');
        select.id = 'amazon-filter-select';
        Object.assign(select.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '9999',
            padding: '8px',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#232f3e',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        });

        for (const option of Object.keys(FILTER_OPTIONS)) {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            if (option === getCurrentFilter()) opt.selected = true;
            select.appendChild(opt);
        }

        select.addEventListener('change', () => {
            setCurrentFilter(select.value);
            filterResults();
        });

        document.body.appendChild(select);
    }

    function waitForBodyAndInit() {
        if (!document.body) return setTimeout(waitForBodyAndInit, 100);

        createDropdown();
        filterResults();

        const observer = new MutationObserver(() => filterResults());
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    waitForBodyAndInit();
})();
