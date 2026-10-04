// ==UserScript==
// @name         Xbox PriceLens
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.1.0
// @description  Get a clear view of global Xbox pricing. PriceLens adds a powerful, customizable dashboard to game pages, showing you what a game costs in different countries—all in your home currency. Pin your favorite stores and let PriceLens help you focus on the best deals.
// @author       TheSina
// @match        *://www.xbox.com/*/games/store/*
// @connect      cdn.jsdelivr.net
// @connect      latest.currency-api.pages.dev
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Xbox_PriceLens.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Xbox_PriceLens.meta.js
// ==/UserScript==
/* jshint esversion: 11 */
(async function () {
    'use strict';

    // 1) Centralized Configuration
    const CONFIG = {
        // Xbox.com uses CSS modules whose class names end in a build hash
        // (e.g. "Price-module__boldText___+XhBG") that changes on every
        // deploy, so match on the stable prefix only.
        SELECTORS: {
            priceText: '[class*="Price-module__boldText"]',
            headerPriceText:
                '[class*="ProductDetailsHeader-module__"] [class*="Price-module__boldText"]',
            insertionPoint: '[class*="Price-module__priceBaseContainer"]',
            buyButton: 'button[data-m*="Buy"]',
            banner: '.xbox-banner',
        },
        API_BASE_URLS: [
            'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/',
            'https://latest.currency-api.pages.dev/v1/currencies/',
        ],
        RETRY_DELAY: 750,
        CACHE: {
            KEY_RATES_PREFIX: 'xboxCurrencyRates_v4.2_',
            KEY_TIMESTAMP_PREFIX: 'xboxCurrencyRatesTS_v4.2_',
            TTL: 12 * 60 * 60 * 1000,
        },
    };

    // 2) Style Injection
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .xbox-banner,
        .xbox-row,
        .xbox-modal,
        .xbox-modal-section,
        .xbox-settings-btn {
    font-family:
        system-ui,
        'Noto Sans',
        'Segoe UI',
        'Noto Color Emoji',
        'Apple Color Emoji',
        'Segoe UI Emoji',
        'Segoe UI Symbol',
        sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 14px;
}
        .xbox-banner {
            position: relative;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            margin: 16px 0;
            padding: 12px 16px;
            font-size: 0.95rem;
            line-height: 1.4;
            color: #333;
            min-height: 50px;
        }

        .xbox-rows {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-content: flex-start;
        }

        .xbox-row {
            flex: 1 1 calc(50% - 8px);
            background: #f9f9f9;
            padding: 8px;
            border-radius: 4px;
            direction: ltr;
            text-align: left;
            border-left: 3px solid transparent;
            transition:
                background-color 0.2s,
                border-color 0.2s;
        }

        .xbox-row.default-store-highlight {
            background-color: #e6ffed;
            border-left-color: #4caf50;
        }

        .xbox-row.error {
            color: #d32f2f;
        }

        .xbox-row.loading {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #888;
            background: none;
        }

        .xbox-row .error-text {
            color: currentColor;
        }

        .rtl-text {
            direction: rtl;
            unicode-bidi: embed;
            display: inline-block;
        }

        .xbox-settings-btn {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: none;
            border: none;
            cursor: pointer;
            color: currentColor;
            padding: 4px;
            font-size: 1.2rem;
            z-index: 1;
        }

        .xbox-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 9999;
        }

        .xbox-overlay.show {
            opacity: 1;
        }

        .xbox-modal {
            background: #fff;
            color: #000;
            padding: 20px;
            border-radius: 8px;
            width: 500px;
            max-width: 95%;
            font-size: 1rem;
            line-height: 1.4;
        }

        .xbox-modal h3 {
            margin: 0 0 16px;
        }

        .xbox-modal h4 {
            margin: 16px 0 8px;
        }

        .stores-list {
            column-count: 2;
            column-gap: 20px;
        }

        .xbox-modal-section {
            margin-bottom: 16px;
        }

        .xbox-modal-section select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .xbox-modal-actions {
            text-align: right;
            margin-top: 24px;
        }

        .xbox-modal-actions-links {
            margin-bottom: 16px;
        }

        .xbox-modal-actions-links a {
            margin-right: 12px;
            cursor: pointer;
        }

        .xbox-modal-actions button:not(:last-child) {
            margin-right: 8px;
        }

        .switch {
            display: flex;
            align-items: center;
            margin: 6px 0;
            cursor: pointer;
            break-inside: avoid-column;
        }

        .switch input {
            opacity: 0;
            width: 1px;
            height: 1px;
        }

        .switch .slider {
            width: 36px;
            height: 18px;
            background: #ccc;
            border-radius: 9px;
            margin-right: 10px;
            position: relative;
            transition: background 0.2s;
        }

        .switch .slider::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            top: 1px;
            left: 1px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.2s;
        }

        .switch input:checked + .slider {
            background: #4caf50;
        }

        .switch input:checked + .slider::after {
            transform: translateX(18px);
        }

        .switch input:focus-visible + .slider {
            box-shadow: 0 0 0 2px #0078d4;
        }

        @media (max-width: 420px) {
            .stores-list {
                column-count: 1;
            }
        }

        @media (prefers-color-scheme: dark) {
            .xbox-banner {
                background: #1e1e1e;
                color: #ddd;
            }

            .xbox-row {
                background: #2a2a2a;
            }

            .xbox-row.default-store-highlight {
                background-color: #1a3d20;
                border-left-color: #66bb6a;
            }

            .xbox-row.loading {
                color: #666;
            }

            .xbox-row.error {
                color: #ef5350;
            }

            .xbox-modal {
                background: #2a2a2a;
                color: #ccc;
            }

            .xbox-modal-section select {
                background: #333;
                color: #ccc;
                border-color: #555;
            }

            .xbox-settings-btn {
                color: #fff;
            }
        }
    `;
        document.head.appendChild(style);
    }

    // 3) Currency & Tax Definitions
    const CURRENCIES = [
        {
            code: 'ar',
            api: 'ars',
            region: 'es-ar',
            flag: '🇦🇷',
            name: 'Argentina Store',
            link: 'Argentina Store',
            // 21% IVA. Impuesto PAIS was repealed in Dec 2024 and the
            // Ganancias perception on games is 0% since Apr 2025.
            tax: 0.21,
            decimal: ',',
            fmt: x =>
                `ARS${new Intl.NumberFormat('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x).replace(/\s/g, '')}`,
        },
        {
            code: 'au',
            api: 'aud',
            region: 'en-au',
            flag: '🇦🇺',
            name: 'Australia Store',
            link: 'Australia Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `AU$${new Intl.NumberFormat('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'br',
            api: 'brl',
            region: 'pt-br',
            flag: '🇧🇷',
            name: 'Brazil Store',
            link: 'Brazil Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                })
                    .format(x)
                    .replace(/\s/g, ''),
        },
        {
            code: 'ca',
            api: 'cad',
            region: 'en-ca',
            flag: '🇨🇦',
            name: 'Canada Store',
            link: 'Canada Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `CAD ${new Intl.NumberFormat('en-CA', {style: 'currency', currency: 'CAD'}).format(x)}`,
            showPlusTax: true,
        },
        {
            code: 'ch',
            api: 'chf',
            region: 'de-ch',
            flag: '🇨🇭',
            name: 'Switzerland Store',
            link: 'Switzerland Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `CHF ${new Intl.NumberFormat('de-CH', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'cl',
            api: 'clp',
            region: 'es-cl',
            flag: '🇨🇱',
            name: 'Chile Store',
            link: 'Chile Store',
            tax: 0,
            decimal: ',',
            fmt: x => `$${new Intl.NumberFormat('es-CL').format(x)}`,
            showPlusTax: true,
        },
        {
            code: 'co',
            api: 'cop',
            region: 'es-co',
            flag: '🇨🇴',
            name: 'Colombia Store',
            link: 'Colombia Store',
            tax: 0,
            decimal: ',',
            fmt: x => `COP$${new Intl.NumberFormat('es-CO').format(x)}`,
            showPlusTax: true,
        },
        {
            code: 'cz',
            api: 'czk',
            region: 'cs-cz',
            flag: '🇨🇿',
            name: 'Czechia Store',
            link: 'Czechia Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                `${new Intl.NumberFormat('cs-CZ', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)} Kč`,
        },
        {
            code: 'gb',
            api: 'gbp',
            region: 'en-gb',
            flag: '🇬🇧',
            name: 'UK Store',
            link: 'UK Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: 'GBP',
                }).format(x),
        },
        {
            code: 'hk',
            api: 'hkd',
            region: 'en-hk',
            flag: '🇭🇰',
            name: 'Hong Kong Store',
            link: 'Hong Kong Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `HK$${new Intl.NumberFormat('en-HK', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'hu',
            api: 'huf',
            region: 'hu-hu',
            flag: '🇭🇺',
            name: 'Hungary Store',
            link: 'Hungary Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                `${new Intl.NumberFormat('hu-HU', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)} HUF`,
        },
        {
            code: 'in',
            api: 'inr',
            region: 'en-in',
            flag: '🇮🇳',
            name: 'India Store',
            link: 'India Store',
            tax: 0.18,
            decimal: '.',
            fmt: x =>
                new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })
                    .format(x)
                    .replace(/\s/g, ''),
        },
        {
            code: 'jp',
            api: 'jpy',
            region: 'ja-jp',
            flag: '🇯🇵',
            name: 'Japan Store',
            link: 'Japan Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                new Intl.NumberFormat('ja-JP', {
                    style: 'currency',
                    currency: 'JPY',
                }).format(x),
        },
        {
            code: 'kr',
            api: 'krw',
            region: 'ko-kr',
            flag: '🇰🇷',
            name: 'South Korea Store',
            link: 'South Korea Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                new Intl.NumberFormat('ko-KR', {
                    style: 'currency',
                    currency: 'KRW',
                })
                    .format(x)
                    .replace(/\s/g, ''),
        },
        {
            code: 'mx',
            api: 'mxn',
            region: 'es-mx',
            flag: '🇲🇽',
            name: 'Mexico Store',
            link: 'Mexico Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `MXN$${new Intl.NumberFormat('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'no',
            api: 'nok',
            region: 'nb-no',
            flag: '🇳🇴',
            name: 'Norway Store',
            link: 'Norway Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                `kr ${new Intl.NumberFormat('nb-NO', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'nz',
            api: 'nzd',
            region: 'en-nz',
            flag: '🇳🇿',
            name: 'New Zealand Store',
            link: 'New Zealand Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `NZ$${new Intl.NumberFormat('en-NZ', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'pl',
            api: 'pln',
            region: 'pl-pl',
            flag: '🇵🇱',
            name: 'Poland Store',
            link: 'Poland Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                `${new Intl.NumberFormat('pl-PL', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)} zł`,
        },
        {
            code: 'sa',
            api: 'sar',
            region: 'ar-sa',
            flag: '🇸🇦',
            name: 'Saudi Arabia Store',
            link: 'Saudi Arabia Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                }).format(x),
            preParse: str => str.replace(/ر\.س\.‏/g, ''),
            isRTL: true,
        },
        {
            code: 'se',
            api: 'sek',
            region: 'sv-se',
            flag: '🇸🇪',
            name: 'Sweden Store',
            link: 'Sweden Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                `${new Intl.NumberFormat('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)} kr`,
        },
        {
            code: 'sg',
            api: 'sgd',
            region: 'en-sg',
            flag: '🇸🇬',
            name: 'Singapore Store',
            link: 'Singapore Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                `S$${new Intl.NumberFormat('en-SG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
        {
            code: 'tr',
            api: 'try',
            region: 'tr-TR',
            flag: '🇹🇷',
            name: 'Turkey Store',
            link: 'Turkey Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })
                    .format(x)
                    .replace(/\s/g, ''),
        },
        {
            code: 'tw',
            api: 'twd',
            region: 'zh-tw',
            flag: '🇹🇼',
            name: 'Taiwan Store',
            link: 'Taiwan Store',
            tax: 0,
            decimal: '.',
            fmt: x => `NT$${new Intl.NumberFormat('zh-TW').format(x)}`,
        },
        {
            code: 'us',
            api: 'usd',
            region: 'en-us',
            flag: '🇺🇸',
            name: 'US Store',
            link: 'US Store',
            tax: 0,
            decimal: '.',
            fmt: x =>
                new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }).format(x),
            showPlusTax: true,
        },
        {
            code: 'za',
            api: 'zar',
            region: 'en-za',
            flag: '🇿🇦',
            name: 'South Africa Store',
            link: 'South Africa Store',
            tax: 0,
            decimal: ',',
            fmt: x =>
                `R ${new Intl.NumberFormat('en-ZA', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(x)}`,
        },
    ];

    // 4) Preference Management Module
    const Prefs = {
        visible: {},
        sortOrder: 'lowest',
        defaultStore: 'us',
        defaults: ['us', 'tr', 'in', 'ar'],
        async load() {
            this.visible = await GM_getValue('visibleCurrencies_v4.2', {});
            this.sortOrder = await GM_getValue(
                'currencySortOrder_v4.2',
                'lowest',
            );
            this.defaultStore = await GM_getValue('defaultStore_v4.2', 'us');
            let needsSave = false;
            CURRENCIES.forEach(c => {
                if (this.visible[c.code] === undefined) {
                    this.visible[c.code] = this.defaults.includes(c.code);
                    needsSave = true;
                }
            });
            if (needsSave) await this.save();
        },
        async save() {
            await GM_setValue('visibleCurrencies_v4.2', this.visible);
            await GM_setValue('currencySortOrder_v4.2', this.sortOrder);
            await GM_setValue('defaultStore_v4.2', this.defaultStore);
        },
    };

    // 5) Data Fetching, Caching & Parsing
    async function getRates(baseCurrencyApi) {
        const now = Date.now();
        const cacheKeyRates = `${CONFIG.CACHE.KEY_RATES_PREFIX}${baseCurrencyApi}`;
        const cacheKeyTs = `${CONFIG.CACHE.KEY_TIMESTAMP_PREFIX}${baseCurrencyApi}`;
        const ts = await GM_getValue(cacheKeyTs, 0);
        const cachedRates = await GM_getValue(cacheKeyRates, null);
        if (cachedRates && now - ts < CONFIG.CACHE.TTL) return cachedRates;

        for (const baseUrl of CONFIG.API_BASE_URLS) {
            const data = await fetchRatesFrom(
                `${baseUrl}${baseCurrencyApi}.json`,
                baseCurrencyApi,
            );
            if (data) {
                await GM_setValue(cacheKeyRates, data);
                await GM_setValue(cacheKeyTs, now);
                return data;
            }
        }
        // All sources failed: stale rates are better than no rates.
        return cachedRates;
    }

    function fetchRatesFrom(url, baseCurrencyApi) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        try {
                            resolve(
                                JSON.parse(r.responseText)[baseCurrencyApi] ||
                                    null,
                            );
                        } catch (e) {
                            console.error('API parse failed:', e);
                            resolve(null);
                        }
                    } else {
                        console.error('API request failed:', r.status, url);
                        resolve(null);
                    }
                },
                onerror: e => {
                    console.error('API network error:', e);
                    resolve(null);
                },
            });
        });
    }

    // Store pages embed their full Redux state as JSON. It carries the exact
    // numeric price and currency per SKU, which is far more reliable than
    // scraping (and locale-parsing) the rendered price text.
    function extractPriceFromState(html, productId, sku) {
        const match = html.match(
            /window\.__PRELOADED_STATE__\s*=\s*(\{[^\n]*\})\s*;?\s*$/m,
        );
        if (!match) return null;
        let state;
        try {
            state = JSON.parse(match[1]);
        } catch (e) {
            return null;
        }
        const summaries = state?.core2?.products?.productSummaries;
        if (!summaries) return null;

        const key = Object.keys(summaries).find(
            k => k.toUpperCase() === productId.toUpperCase(),
        );
        const offers = (
            summaries[key]?.specificPrices?.purchaseable || []
        ).filter(p => !sku || p.skuId === sku);
        // "None" is the public price; others are Game Pass/EA Play member offers.
        const offer =
            offers.find(p => p.eligibilityInfo?.eligibility === 'None') ||
            offers[0];
        if (!offer || typeof offer.listPrice !== 'number') {
            return {price: null, currency: null};
        }
        return {price: offer.listPrice, currency: offer.currency || null};
    }

    function extractPriceFromDom(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const el =
            doc.querySelector(CONFIG.SELECTORS.headerPriceText) ||
            doc.querySelector(CONFIG.SELECTORS.priceText);
        return el?.textContent.replace(/\+\s*$/, '').trim() || null;
    }

    function fetchWithRetry(currency, url, productId, sku, retries = 1) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: r => {
                    if (r.status >= 500 && retries > 0) {
                        setTimeout(
                            () =>
                                resolve(
                                    fetchWithRetry(
                                        currency,
                                        url,
                                        productId,
                                        sku,
                                        retries - 1,
                                    ),
                                ),
                            CONFIG.RETRY_DELAY,
                        );
                        return;
                    }
                    const result = {
                        code: currency.code,
                        price: null,
                        priceStr: null,
                        currency: null,
                        error: null,
                    };
                    if (r.status >= 200 && r.status < 300) {
                        const fromState = extractPriceFromState(
                            r.responseText,
                            productId,
                            sku,
                        );
                        if (fromState) {
                            // The state was readable: a missing price means
                            // the product is not sold in this store.
                            result.price = fromState.price;
                            result.currency = fromState.currency;
                        } else {
                            result.priceStr = extractPriceFromDom(
                                r.responseText,
                            );
                            if (!result.priceStr)
                                result.error = 'Price not found';
                        }
                    } else {
                        result.error = `Request failed (${r.status})`;
                    }
                    resolve(result);
                },
                onerror: () => {
                    if (retries > 0) {
                        setTimeout(
                            () =>
                                resolve(
                                    fetchWithRetry(
                                        currency,
                                        url,
                                        productId,
                                        sku,
                                        retries - 1,
                                    ),
                                ),
                            CONFIG.RETRY_DELAY,
                        );
                    } else {
                        resolve({
                            code: currency.code,
                            price: null,
                            priceStr: null,
                            currency: null,
                            error: 'Network Error',
                        });
                    }
                },
            });
        });
    }

    function fetchAllPrices(urls, currenciesToFetch, productId, sku) {
        const promises = currenciesToFetch.map(c =>
            fetchWithRetry(c, urls[c.code], productId, sku),
        );
        return Promise.all(promises);
    }

    function parsePrice(priceString, separator = '.') {
        const cleanRegex = new RegExp(`[^\\d\\${separator}]`, 'g');
        const cleaned = priceString.replace(cleanRegex, '');
        const normalized =
            separator === '.' ? cleaned : cleaned.replace(separator, '.');
        return parseFloat(normalized);
    }

    // 6) UI & DOM Manipulation
    function createBanner() {
        const banner = document.createElement('div');
        banner.className = 'xbox-banner';
        const rowsContainer = document.createElement('div');
        rowsContainer.className = 'xbox-rows';
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'xbox-settings-btn';
        settingsBtn.textContent = '⚙️';
        settingsBtn.title = 'Settings';
        settingsBtn.setAttribute('aria-label', 'Price Settings');
        banner.append(rowsContainer, settingsBtn);
        return {
            banner,
            rowsContainer,
            settingsBtn,
        };
    }

    function updateBannerDisplay(container, lines) {
        const sorted = [...lines]
            .filter(item => Prefs.visible[item.code])
            .sort((a, b) => {
                // avoid the “line break before ‘?’” warning by using an if/else
                if (Prefs.sortOrder === 'alpha') {
                    return a.name.localeCompare(b.name);
                }
                return a.convertedPrice - b.convertedPrice;
            });

        container.innerHTML = '';

        if (sorted.length === 0) {
            container.innerHTML = `<div class="xbox-row">No stores selected.</div>`;
            return;
        }

        sorted.forEach(item => {
            const row = document.createElement('div');
            row.className = 'xbox-row';

            if (item.error) {
                row.classList.add('error');
            }
            if (item.code === Prefs.defaultStore) {
                row.classList.add('default-store-highlight');
            }

            row.innerHTML = item.html;
            container.appendChild(row);
        });
    }

    function showSettingsModal(lines, rowsContainer) {
        let lastFocusedElement = document.activeElement;
        const overlay = document.createElement('div');
        overlay.className = 'xbox-overlay';
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        const modal = document.createElement('div');
        modal.className = 'xbox-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'xbox-modal-title');

        const defaultStoreOptions = CURRENCIES.map(
            c =>
                `<option value="${c.code}" ${Prefs.defaultStore === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`,
        ).join('');

        modal.innerHTML = `<h3 id="xbox-modal-title">Settings</h3>
            <div class="xbox-modal-section">
                <h4>Default Store (for Conversion)</h4>
                <select id="default-store-select">${defaultStoreOptions}</select>
            </div>
            <div class="xbox-modal-section">
                <h4>Visible Stores</h4>
                <div class="stores-list"></div>
                <div class="xbox-modal-actions-links">
                    <a href="#" data-action="default">Select Default</a>
                    <a href="#" data-action="all">Select All</a>
                    <a href="#" data-action="none">Select None</a>
                </div>
            </div>
            <div class="xbox-modal-section">
                <h4>Sort Order</h4>
                <select id="sort-order-select">
                    <option value="lowest" ${Prefs.sortOrder === 'lowest' ? 'selected' : ''}>Lowest Price</option>
                    <option value="alpha" ${Prefs.sortOrder === 'alpha' ? 'selected' : ''}>Alphabetical</option>
                </select>
            </div>
            <div class="xbox-modal-actions">
                <button class="cancel">Cancel</button>
                <button class="save">Save</button>
            </div>`;

        const storesList = modal.querySelector('.stores-list');
        CURRENCIES.forEach(c => {
            storesList.insertAdjacentHTML(
                'beforeend',
                `<label class="switch">
                <input type="checkbox" value="${c.code}" ${Prefs.visible[c.code] ? 'checked' : ''}>
                <span class="slider" role="presentation"></span><span>${c.flag} ${c.link}</span></label>`,
            );
        });
        overlay.appendChild(modal);

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select',
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        firstFocusable.focus();

        const handleKeyDown = e => {
            if (e.key === 'Escape') {
                close();
                return;
            }
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        };

        let closed = false;
        const finishClose = () => {
            if (closed) return;
            closed = true;
            overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
            lastFocusedElement?.focus();
        };
        const close = () => {
            overlay.classList.remove('show');
            overlay.addEventListener('transitionend', finishClose, {
                once: true,
            });
            // transitionend never fires if the transition is skipped
            // (e.g. reduced motion), so don't leave the overlay stuck.
            setTimeout(finishClose, 400);
        };

        document.addEventListener('keydown', handleKeyDown);
        modal.querySelector('.cancel').addEventListener('click', close);
        overlay.addEventListener('click', e => {
            if (e.target === overlay) close();
        });
        modal.querySelector('.save').addEventListener('click', async () => {
            modal.querySelectorAll('.stores-list input').forEach(cb => {
                Prefs.visible[cb.value] = cb.checked;
            });
            Prefs.sortOrder = modal.querySelector('#sort-order-select').value;
            Prefs.defaultStore = modal.querySelector(
                '#default-store-select',
            ).value;
            await Prefs.save();
            runScript(true);
            close();
        });
        modal
            .querySelector('.xbox-modal-actions-links')
            .addEventListener('click', e => {
                e.preventDefault();
                const action = e.target.dataset.action;
                if (!action) return;
                modal.querySelectorAll('.stores-list input').forEach(cb => {
                    if (action === 'all') cb.checked = true;
                    else if (action === 'none') cb.checked = false;
                    else if (action === 'default')
                        cb.checked = Prefs.defaults.includes(cb.value);
                });
            });
    }

    // 7) Main Execution Logic
    function findInsertionPoint() {
        // Skip price containers nested in the Buy button or product cards.
        return (
            Array.from(
                document.querySelectorAll(CONFIG.SELECTORS.insertionPoint),
            ).find(el => !el.closest('button, a')) || null
        );
    }

    async function main(product) {
        const anchor = findInsertionPoint();
        if (!anchor) return;

        const {banner, rowsContainer, settingsBtn} = createBanner();
        banner.dataset.xboxSku = product.key;
        rowsContainer.innerHTML = `<div class="xbox-row loading">Loading prices...</div>`;
        anchor.parentNode.insertBefore(banner, anchor.nextSibling);

        const parts = location.pathname.split('/').filter(p => p);
        const storeIdx = parts.indexOf('store');
        const [, slug, urlProd] = parts.slice(storeIdx);
        const prod = product.pid || urlProd;
        const sku = product.sku;
        const currenciesToFetch = CURRENCIES.filter(c => Prefs.visible[c.code]);

        if (currenciesToFetch.length === 0) {
            updateBannerDisplay(rowsContainer, []);
            settingsBtn.addEventListener('click', () =>
                showSettingsModal([], rowsContainer),
            );
            return;
        }

        const urls = Object.fromEntries(
            CURRENCIES.map(c => [
                c.code,
                `https://www.xbox.com/${c.region}/games/store/${slug}/${prod}/${sku}`,
            ]),
        );
        const priceResults = await fetchAllPrices(
            urls,
            currenciesToFetch,
            prod,
            sku,
        );
        const rawPrices = Object.fromEntries(
            priceResults.map(r => [
                r.code,
                {
                    priceStr: r.priceStr,
                    currency: r.currency,
                    error: r.error,
                },
            ]),
        );
        const parsedValues = {};
        currenciesToFetch.forEach(c => {
            const result = priceResults.find(r => r.code === c.code);
            const raw = rawPrices[c.code];
            if (result?.price != null) {
                parsedValues[c.code] = result.price;
            } else if (raw?.priceStr) {
                let strToParse = raw.priceStr;
                if (c.preParse) {
                    strToParse = c.preParse(strToParse);
                }
                const parsed = parsePrice(strToParse, c.decimal);
                if (Number.isFinite(parsed)) {
                    parsedValues[c.code] = parsed;
                } else {
                    raw.error = 'Parse failed';
                }
            }
        });

        const defaultCurrency =
            CURRENCIES.find(c => c.code === Prefs.defaultStore) ||
            CURRENCIES.find(c => c.code === 'us');
        const rates = await getRates(defaultCurrency.api);

        if (!rates) {
            rowsContainer.innerHTML = `<div class="xbox-row error">Could not load exchange rates for ${defaultCurrency.name}.</div>`;
            return;
        }

        const displayLines = CURRENCIES.map(c => {
            if (!Prefs.visible[c.code]) {
                return {
                    code: c.code,
                    html: '',
                };
            }
            const value = parsedValues[c.code];
            const raw = rawPrices[c.code];
            let html,
                convertedPrice = Infinity;

            const linkHtml = `<a href="${urls[c.code]}" target="_blank" rel="noopener noreferrer">${c.name}</a>`;
            const nameWithFlag = `${c.flag} ${linkHtml}`;

            // Trust the currency the store reports; fall back to the default.
            const currencyCode = (raw.currency || c.api).toLowerCase();
            const fmtLocal =
                currencyCode === c.api
                    ? c.fmt
                    : x =>
                          new Intl.NumberFormat(c.region, {
                              style: 'currency',
                              currency: currencyCode.toUpperCase(),
                          }).format(x);
            const rate = rates[currencyCode];

            if (raw.error) {
                console.warn(`Could not fetch price for ${c.name}:`, raw.error);
                html = `${nameWithFlag}: <span class="error-text" title="${raw.error}">⚠️ Couldn’t load</span>`;
            } else if (value === 0) {
                convertedPrice = 0;
                html = `${nameWithFlag}: Free`;
            } else if (value != null && rate) {
                convertedPrice = value / rate;
                html = `${nameWithFlag}: ${defaultCurrency.fmt(convertedPrice)}`;

                if (c.code !== defaultCurrency.code) {
                    let formattedLocal = fmtLocal(value);
                    if (c.isRTL) {
                        formattedLocal = `<span class="rtl-text">${formattedLocal}</span>`;
                    }
                    html += ` (${formattedLocal})`;
                }

                if (c.tax > 0) {
                    const totalConverted = convertedPrice * (1 + c.tax);
                    const totalLocalValue = value * (1 + c.tax);
                    let formattedTaxLocal = fmtLocal(totalLocalValue);

                    if (c.isRTL) {
                        formattedTaxLocal = `<span class="rtl-text">${formattedTaxLocal}</span>`;
                    }
                    html += ` + Tax = ${defaultCurrency.fmt(totalConverted)}`;
                    if (c.code !== defaultCurrency.code) {
                        html += ` (${formattedTaxLocal})`;
                    }
                    convertedPrice = totalConverted;
                } else if (c.showPlusTax) {
                    html += ` + Tax`;
                }
            } else {
                html = `${nameWithFlag}: Not available`;
            }

            return {
                code: c.code,
                name: c.name,
                html,
                convertedPrice,
                error: raw.error,
            };
        });

        settingsBtn.addEventListener('click', () =>
            showSettingsModal(displayLines, rowsContainer),
        );
        updateBannerDisplay(rowsContainer, displayLines);
    }

    function getCurrentProduct() {
        try {
            const buyButton = document.querySelector(
                CONFIG.SELECTORS.buyButton,
            );
            if (!buyButton) return null;
            const mData = JSON.parse(buyButton.dataset.m || '{}');
            if (!mData.sku) return null;
            // Almost every product's SKU is "0010", so the product ID is
            // needed to tell games apart across SPA navigations.
            return {
                pid: mData.pid || null,
                sku: mData.sku,
                key: `${mData.pid || location.pathname}/${mData.sku}`,
            };
        } catch (e) {
            return null;
        }
    }

    // --- Script Initialization and SPA Navigation Handling ---
    let debounceTimer;
    async function runScript(forceRefresh = false) {
        observer.disconnect();
        try {
            const currentProduct = getCurrentProduct();
            const existingBanner = document.querySelector(
                CONFIG.SELECTORS.banner,
            );
            if (!currentProduct) {
                existingBanner?.remove();
                return;
            }
            if (
                !forceRefresh &&
                existingBanner &&
                existingBanner.dataset.xboxSku === currentProduct.key
            ) {
                // re-observe even if we don't run
            } else {
                existingBanner?.remove();
                if (findInsertionPoint()) {
                    await main(currentProduct);
                }
            }
        } catch (error) {
            console.error('Error during script execution:', error);
        } finally {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => runScript(false), 300);
    });
    injectStyles();
    await Prefs.load();
    await runScript(true);
})();
