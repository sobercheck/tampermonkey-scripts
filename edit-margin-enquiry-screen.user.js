// ==UserScript==
// @name         Edit margin enquiry screen
// @namespace    https://au.unleashedsoftware.com
// @version      0.1.0
// @description  Make it obvious when a customer has stopped ordering products
// @author       Mathias Foster
// @icon         https://www.google.com/s2/favicons?domain=unleashedsoftware.com
// @match        https://au.unleashedsoftware.com/v2/Enquiry/UnitSalesEnquiry
// @match        https://go.unleashed.erp.accessacloud.com/v2/Enquiry/UnitSalesEnquiry
// @grant        none
// @run-at       document-idle
// @downloadURL  https://github.com/sobercheck/tampermonkey-scripts/raw/main/edit-margin-enquiry-screen.user.js
// @updateURL    https://github.com/sobercheck/tampermonkey-scripts/raw/main/edit-margin-enquiry-screen.user.js
// ==/UserScript==

(function() {
    'use strict';

    let runReport = document.querySelector("#btnRun");
    let otherRunReport = document.querySelector("#LayoutBox > div:nth-child(10) > div.grid-report.main-grid.grid-with-overlay > div > a");

    runReport.addEventListener("click", () => setTimeout(changeColour, 2000));
    otherRunReport.addEventListener("click", () => setTimeout(changeColour, 2000));

    function changeColour() {
        let elements = document.querySelectorAll('.dx-ar');
        for(var i = 0; i < elements.length; i++) {
            if(elements[i].innerText === "" || elements[i].innerText === "0.00" || elements[i].innerText === "0" || elements[i].innerText === " ") {
                elements[i].style.backgroundColor = "#e8bcc0";

            } else {
                elements[i].style.backgroundColor = "#bce8c3";
            }
        }
    }

})();
