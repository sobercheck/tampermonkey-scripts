// ==UserScript==
// @name         Outline required fields on an Unleashed sales order
// @namespace    https://gwg.nz
// @version      0.15
// @description  Outline required fields on an Unleashed sales order
// @author       You
// @match        https://au.unleashedsoftware.com/v2/SalesOrder/Update/*
// @match        https://go.unleashed.erp.accessacloud.com/v2/SalesOrder/Update/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unleashedsoftware.com
// @grant        none
// @downloadURL  https://github.com/sobercheck/tampermonkey-scripts/raw/main/outline-required-fields-on-an-unleashed-sales-order.user.js
// @updateURL    https://github.com/sobercheck/tampermonkey-scripts/raw/main/outline-required-fields-on-an-unleashed-sales-order.user.js
// ==/UserScript==

(function() {
    'use strict';
    let redBorder = "3px solid rgb(225, 30, 57)";
    
    function changeBorder(element, value) {
        if(value === "") {
            element.style.border = redBorder;
        } else {
            element.style.border = "";
        }
    }
    
    let referenceFieldValue = document.querySelector("#CustomerRef");
    let referenceField = document.querySelector("#InvoiceHeaderTable > tbody > tr:nth-child(3)");
    if(referenceFieldValue.value === "") {
        referenceField.style.border = redBorder;
        referenceFieldValue.addEventListener("change", (event) => {
            changeBorder(referenceField, referenceFieldValue.value);
        });
    }
    
    let deliveryMethodValue = document.querySelector("#DeliveryMethodList");
    let deliveryMethod = document.querySelector("#InvoiceHeaderTable > tbody > tr:nth-child(13)");
    if(deliveryMethodValue.value === "") {
        deliveryMethod.style.border = redBorder;
        deliveryMethodValue.addEventListener("change", (event) => {
            changeBorder(deliveryMethod, deliveryMethodValue.value);
        });
    }
    
    let addressFieldsValue = document.querySelector("#DeliveryStreetAddress");
    let addressFields = document.querySelector("#DeliveryDetailsTable > tbody");
    if(addressFieldsValue.value === "") {
        addressFields.style.border = redBorder;
        addressFieldsValue.addEventListener("change", (event) => {
            changeBorder(addressFields, addressFieldsValue.value);
        });
    }

    let deliveryMethodDuplicateMaybe = document.querySelector("#DeliveryMethodList");
    let country = document.querySelectorAll('country-select-box')[0].attributes[0].nodeValue;
    if(document.querySelector("#DeliveryPostCode").value >= 7000 && document.querySelector("#DeliveryPostCode").value < 10000 && deliveryMethodDuplicateMaybe[deliveryMethodDuplicateMaybe.selectedIndex].text !== "NZ Couriers / Two-Day" && deliveryMethodDuplicateMaybe[deliveryMethodDuplicateMaybe.selectedIndex].text !== "Courier / Slow" && country === "New Zealand") {
        alert("Ask about two-day shipping to the South Island!");
    }

    let paymentTerms = document.querySelector("#PaymentTerms");
    if(paymentTerms.textContent === "Prepaid") {
        // alert("Prepaid. Have you collected payment yet?");
    }
    
})();
