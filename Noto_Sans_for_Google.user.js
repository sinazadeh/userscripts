// ==UserScript==
// @name         Noto Sans for Google
// @namespace    https://github.com/sinazadeh/userscripts
// @version      1.0.0
// @description  Replaces Arial and Roboto with the locally installed Noto Sans font on Google websites.
// @author       TheSina
// @match        *://*.google.*/*
// @exclude      *://*.google.*/recaptcha/*
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Noto_Sans_for_Google.user.js
// @updateURL    https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Noto_Sans_for_Google.meta.js
// ==/UserScript==

(function () {
    'use strict';
    GM_addStyle(`
        @font-face {
            font-family: 'Arial';
            src: local('Noto Sans');
        }
        @font-face {
            font-family: 'Roboto';
            src: local('Noto Sans');
        }
        @font-face {
            font-family: 'Open Sans';
            src: local('Noto Sans');
        }
    `);
})();
