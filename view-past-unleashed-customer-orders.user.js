// ==UserScript==
// @name         View past Unleashed customer orders
// @namespace    https://au.unleashedsoftware.com
// @version      0.5.0
// @description  Provide a quick way to see a customer's past orders, sorted by product.
// @author       Mathias Foster
// @match        https://au.unleashedsoftware.com/v2/Customer/Update/*
// @match        https://go.unleashed.erp.accessacloud.com/v2/Customer/Update/*
// @icon         https://www.google.com/s2/favicons?domain=unleashedsoftware.com
// @grant        none
// @downloadURL  https://github.com/sobercheck/tampermonkey-scripts/raw/main/view-past-unleashed-customer-orders.user.js
// @updateURL    https://github.com/sobercheck/tampermonkey-scripts/raw/main/view-past-unleashed-customer-orders.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Flip to true to trace what the script is doing in the browser console.
    const DEBUG = false;
    const log = (...args) => { if (DEBUG) console.log('[past-orders]', ...args); };

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

    // Marks our button so a re-run can't add a second one.
    const BUTTON_ID = 'sc-view-products-button';

    // Unleashed renders parts of this page after load, so poll for the element
    // rather than assuming it's there the moment the script runs.
    function waitFor(selector, timeoutMs = 10000) {
        return new Promise((resolve) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeoutMs);
        });
    }

    function buildReportURL(customerID, customerCode) {
        const now = new Date();
        const year = now.getFullYear();
        const endMonth = MONTH_NAMES[now.getMonth()];

        // Rolling 12 months: start the month after this one, a year back.
        // In December that wraps to January of the current year.
        const startMonthIdx = (now.getMonth() + 1) % 12;
        const startMonth = MONTH_NAMES[startMonthIdx];
        const startYear = startMonthIdx === 0 ? year : year - 1;

        const params = [
            'customerId=' + customerID,
            'start=' + startMonth + '+' + startYear,
            'end=' + endMonth + '+' + year,
            'customerCode=' + customerCode.replace(/ /g, '+'),
            'includingCredits=true'
        ].join(',');

        return window.location.origin + '/v2/Enquiry/UnitSalesEnquiry#' + params;
    }

    async function init() {
        if (document.getElementById(BUTTON_ID)) {
            log('button already present, skipping');
            return;
        }

        // Read from pathname so a query string or hash can't end up in the ID.
        const path = window.location.pathname.replace(/\/+$/, '');
        const customerID = path.slice(path.lastIndexOf('/') + 1);
        if (!customerID) {
            log('no customer ID in URL');
            return;
        }

        const codeEl = await waitFor('#CustomerCodeDisplay');
        if (!codeEl) {
            log('#CustomerCodeDisplay never appeared');
            return;
        }

        const buttonContainer = await waitFor('.buttons');
        if (!buttonContainer || !buttonContainer.firstElementChild) {
            log('.buttons container not usable');
            return;
        }

        const customerCode = codeEl.innerText.trim();
        const reportURL = buildReportURL(customerID, customerCode);
        log('customer', customerID, customerCode, reportURL);

        const orderButton = document.createElement('a');
        orderButton.id = BUTTON_ID;
        orderButton.classList.add('fm-button');
        orderButton.href = reportURL;
        orderButton.innerText = 'View Products';
        buttonContainer.firstElementChild.insertAdjacentElement('beforebegin', orderButton);
    }

    init();
})();
