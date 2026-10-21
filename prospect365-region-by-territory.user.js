// ==UserScript==
// @name         Prospect 365 - filter Region by Territory
// @namespace    https://prospect365.com
// @version      0.2.0
// @description  On a Prospect 365 company record, hide Region options that don't belong to the selected Territory. Warns you if Prospect changes the page underneath it.
// @author       Sober Check
// @match        https://*.prospect365.com/view/*
// @icon         https://www.google.com/s2/favicons?domain=prospect365.com
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL  https://github.com/sobercheck/tampermonkey-scripts/raw/main/prospect365-region-by-territory.user.js
// @updateURL    https://github.com/sobercheck/tampermonkey-scripts/raw/main/prospect365-region-by-territory.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ---------------------------------------------------------------- config

    // Flip to true to trace what the script is doing in the browser console.
    const DEBUG = false;

    // Flip to true to dump what the script can see about both fields. Use this
    // first when something breaks - it prints the label, control ids and how
    // every region option parses.
    const DIAGNOSE = false;

    // Prospect labels each field's <input> with the underlying API field name
    // plus a volatile layout id, e.g. "DivisionXtra.StandardDropdownField1_287".
    // We match on the stable prefix. These are the real anchors - the visible
    // label text is only a fallback, because renaming a field in the layout
    // editor changes the text but not the field name.
    const TERRITORY_FIELD = 'Territory';
    const REGION_FIELD = 'DivisionXtra.StandardDropdownField1';

    // Fallback only, and what the warning banner calls the fields.
    const TERRITORY_LABEL = 'Territory';
    const REGION_LABEL = 'Region';

    // What Prospect shows in a dropdown that has no value chosen.
    const NONE_LABEL = '[None]';

    // Valid Australian territory codes. A region must resolve to one of these
    // or it is left visible - see parseState().
    const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

    // Territories that mean "don't filter anything".
    const SHOW_EVERYTHING = ['australia-wide', 'australia wide', 'national', 'all'];

    // Only needed for regions whose name can't carry its state. Anything
    // following the "Pilbara (WA)" or "WA - Pilbara" convention is picked up
    // automatically, so adding a region in Prospect needs no change here.
    const REGION_OVERRIDES = {
        // 'Riverina': 'NSW',
    };

    // Whether "this territory has no regions at all" should raise the red
    // banner. Off by default: while only WA regions exist, every NSW/QLD/VIC
    // record legitimately has nothing to offer, and that's a gap in the data
    // rather than a broken script - so it stays a console note. Turn this on
    // once every state has regions configured, and it becomes a useful alarm
    // for regions added without their state in the name.
    const WARN_WHEN_TERRITORY_HAS_NO_REGIONS = false;

    // How long to wait for the record to render before warning.
    const FIELD_TIMEOUT_MS = 20000;

    // At most one desktop notification per fault per this many hours, so a
    // layout change doesn't nag on every record opened.
    const NOTIFY_COOLDOWN_HOURS = 12;

    const log = (...a) => { if (DEBUG || DIAGNOSE) console.log('[region-filter]', ...a); };
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

    // --------------------------------------------------------------- parsing

    // Reads the state out of a region's name. Handles the suffix style now in
    // the CRM ("Pilbara (WA)") and the prefix style ("WA - Pilbara"), so the
    // script survives a rename of the option set.
    //
    // Returns null for anything it can't read - including "[None]" and
    // "Configure...", which Prospect adds to every dropdown and which must
    // always stay visible.
    function parseState(labelText) {
        const text = clean(labelText);
        if (!text) return null;

        if (Object.prototype.hasOwnProperty.call(REGION_OVERRIDES, text)) {
            return REGION_OVERRIDES[text];
        }

        const suffix = text.match(/\(\s*([A-Za-z]{2,3})\s*\)\s*$/);
        if (suffix && STATES.includes(suffix[1].toUpperCase())) return suffix[1].toUpperCase();

        const prefix = text.match(/^([A-Za-z]{2,3})\s*[-–—:]\s*\S/);
        if (prefix && STATES.includes(prefix[1].toUpperCase())) return prefix[1].toUpperCase();

        return null;
    }

    // '*' means show everything; null means the value isn't a state we know.
    function normaliseTerritory(raw) {
        const text = clean(raw);
        if (!text || text === NONE_LABEL) return '*';
        if (SHOW_EVERYTHING.includes(text.toLowerCase())) return '*';

        const upper = text.toUpperCase();
        if (STATES.includes(upper)) return upper;

        // Tolerates the field holding a full state name rather than the code.
        const byName = {
            'AUSTRALIAN CAPITAL TERRITORY': 'ACT', 'NEW SOUTH WALES': 'NSW',
            'NORTHERN TERRITORY': 'NT', 'QUEENSLAND': 'QLD', 'SOUTH AUSTRALIA': 'SA',
            'TASMANIA': 'TAS', 'VICTORIA': 'VIC', 'WESTERN AUSTRALIA': 'WA'
        };
        return byName[upper] || null;
    }

    // ---------------------------------------------------------------- health

    // Every failure path routes through here. The rule is fail-open: if the
    // script can't do its job it says so loudly and leaves every option
    // visible, so nobody is ever blocked from picking a region.
    const reported = new Set();

    function reportBroken(code, detail) {
        if (reported.has(code)) return;
        reported.add(code);
        console.warn('[region-filter] not filtering -', code, detail || '');
        unhideAll();
        showBanner(code);
        notifyOnce(code);
    }

    function showBanner(code) {
        if (document.getElementById('sc-region-filter-banner')) return;

        const bar = document.createElement('div');
        bar.id = 'sc-region-filter-banner';
        bar.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
            'background:#8a1f11', 'color:#fff', 'padding:10px 16px',
            'font:13px/1.4 system-ui,sans-serif', 'display:flex',
            'align-items:center', 'gap:12px', 'box-shadow:0 1px 4px rgba(0,0,0,.4)'
        ].join(';');

        const msg = document.createElement('span');
        msg.style.flex = '1';
        msg.textContent = 'Region filtering is off - the full region list is showing, so ' +
            'check the state matches the Territory before saving. (' + code + ')';

        const dismiss = document.createElement('button');
        dismiss.textContent = 'Dismiss';
        dismiss.style.cssText = 'background:#fff;color:#8a1f11;border:0;border-radius:3px;' +
            'padding:4px 10px;cursor:pointer;font:inherit;font-weight:600';
        dismiss.addEventListener('click', () => bar.remove());

        bar.append(msg, dismiss);
        document.body.appendChild(bar);
    }

    function notifyOnce(code) {
        if (typeof GM_notification !== 'function') return;
        const key = 'sc-region-filter-notified:' + code;
        const last = Number(GM_getValue(key, 0));
        if (last && (Date.now() - last) < NOTIFY_COOLDOWN_HOURS * 3600 * 1000) {
            return log('notification suppressed, still in cooldown for', code);
        }
        GM_setValue(key, Date.now());
        GM_notification({
            title: 'Prospect region filter needs attention',
            text: 'The Territory/Region script stopped working (' + code + '). Region ' +
                  'options are unfiltered until it is fixed.',
            timeout: 15000,
            onclick: () => window.focus()
        });
    }

    // --------------------------------------------------------- finding fields

    const isVisible = (el) => !!(el && el.offsetParent !== null);

    // Prospect opens records in stacked dialogs, so the same field can exist
    // several times over. Take the last visible one - that's the dialog on top.
    function findField(fieldName, labelText) {
        let labels = Array.from(document.querySelectorAll('label[for^="' + fieldName + '"]'))
            .filter(isVisible);

        if (!labels.length) {
            // Field renamed or re-slotted: fall back to the visible label text.
            labels = Array.from(document.querySelectorAll('label'))
                .filter((l) => isVisible(l) && clean(l.textContent) === labelText);
        }
        if (!labels.length) return null;

        const label = labels[labels.length - 1];
        const group = label.closest('.form-group') || label.parentElement;
        if (!group) return null;

        const vsel = group.querySelector('.v-select');
        const toggle = group.querySelector('.vs__dropdown-toggle');
        if (!vsel || !toggle) return { label, group, vsel: null, toggle: null, uid: null };

        // vue-select gives each instance a uid: the toggle is "vs3__combobox"
        // and its options are "vs3__option-0". That prefix is the only link
        // between a field and its menu, because the menu is appended to <body>.
        return { label, group, vsel, toggle, uid: String(toggle.id || '').split('__')[0] };
    }

    function readSelected(field) {
        const sel = field.group.querySelector('.vs__selected');
        const text = clean(sel && sel.textContent);
        return text === NONE_LABEL ? '' : text;
    }

    // -------------------------------------------------------------- filtering

    let currentTerritory = '*';
    let regionUid = null;
    const quietlyNoted = new Set();

    function unhideAll() {
        for (const el of document.querySelectorAll('[data-sc-region-hidden]')) {
            el.style.display = '';
            delete el.dataset.scRegionHidden;
        }
    }

    // vue-select appends its open menu straight to <body>, so we can't reach it
    // from the field. We identify it by the uid baked into its option ids.
    function menuUid(menu) {
        const opt = menu.querySelector('li[id*="__option-"]');
        return opt ? String(opt.id).split('__')[0] : null;
    }

    function filterMenu(menu) {
        if (!regionUid || menuUid(menu) !== regionUid) return;

        const options = Array.from(menu.querySelectorAll('li[role="option"]'));
        if (!options.length) return;

        // Show everything when no territory is set, or it's Australia-wide.
        if (currentTerritory === '*') {
            for (const li of options) {
                if (li.dataset.scRegionHidden) {
                    li.style.display = '';
                    delete li.dataset.scRegionHidden;
                }
            }
            return;
        }

        let parseable = 0, keptRegions = 0, hidden = 0;
        for (const li of options) {
            const state = parseState(li.textContent);
            // "[None]" and "Configure..." parse to null and always stay.
            if (state === null) continue;
            parseable++;
            if (state === currentTerritory) {
                keptRegions++;
                if (li.dataset.scRegionHidden) {
                    li.style.display = '';
                    delete li.dataset.scRegionHidden;
                }
            } else {
                li.style.display = 'none';
                li.dataset.scRegionHidden = '1';
                hidden++;
            }
        }

        // Nothing left to pick. Either this state genuinely has no regions yet,
        // or regions were added without their state in the name. Either way,
        // show the lot rather than trapping the user - see the flag above for
        // whether that's worth shouting about.
        if (parseable > 0 && keptRegions === 0) {
            unhideAll();
            const detail = currentTerritory + ' matched none of ' + parseable + ' regions';
            if (WARN_WHEN_TERRITORY_HAS_NO_REGIONS) {
                return reportBroken('no-regions-for-territory', detail);
            }
            if (!quietlyNoted.has(currentTerritory)) {
                quietlyNoted.add(currentTerritory);
                console.info('[region-filter] no regions configured for ' + detail +
                    ' - showing all. Set WARN_WHEN_TERRITORY_HAS_NO_REGIONS to be warned.');
            }
            return;
        }

        log('menu filtered', { territory: currentTerritory, kept: keptRegions, hidden });
    }

    function watchForMenus() {
        const seen = new WeakSet();

        const onMenu = (menu) => {
            filterMenu(menu);
            if (seen.has(menu)) return;
            seen.add(menu);
            // vue-select re-renders the options as the user types in the search
            // box, which would undo our hiding - so re-apply on every change.
            new MutationObserver(() => filterMenu(menu))
                .observe(menu, { childList: true });
        };

        new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches && node.matches('ul.vs__dropdown-menu')) onMenu(node);
                    if (node.querySelectorAll) {
                        node.querySelectorAll('ul.vs__dropdown-menu').forEach(onMenu);
                    }
                }
            }
        }).observe(document.body, { childList: true, subtree: true });

        // Catch a menu that was already open when the script started.
        document.querySelectorAll('ul.vs__dropdown-menu').forEach(onMenu);
    }

    // ------------------------------------------------------------------ init

    function waitForField(fieldName, labelText, timeoutMs) {
        return new Promise((resolve) => {
            const found = findField(fieldName, labelText);
            if (found) return resolve(found);

            const observer = new MutationObserver(() => {
                const f = findField(fieldName, labelText);
                if (f) { observer.disconnect(); resolve(f); }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
        });
    }

    function diagnose(territory, region) {
        const dump = (name, f) => {
            if (!f) return console.log('[region-filter] ' + name + ': NOT FOUND');
            console.log('[region-filter] ' + name + ':', {
                labelFor: f.label.getAttribute('for'),
                labelText: clean(f.label.textContent),
                toggleId: f.toggle ? f.toggle.id : null,
                uid: f.uid,
                selected: readSelected(f),
                hasVSelect: !!f.vsel
            });
        };
        dump('territory', territory);
        dump('region', region);
        const menu = document.querySelector('ul.vs__dropdown-menu');
        console.log('[region-filter] open menu:', menu
            ? { uid: menuUid(menu), options: Array.from(menu.querySelectorAll('li[role="option"]'))
                .map((li) => clean(li.textContent) + ' -> ' + parseState(li.textContent)) }
            : 'none open - open the Region dropdown and run again');
    }

    let territoryWatcher = null;

    async function apply() {
        const territory = await waitForField(TERRITORY_FIELD, TERRITORY_LABEL, FIELD_TIMEOUT_MS);
        const region = findField(REGION_FIELD, REGION_LABEL);

        if (DIAGNOSE) diagnose(territory, region);

        if (!territory) {
            return reportBroken('territory-field-not-found',
                'no field "' + TERRITORY_FIELD + '" / label "' + TERRITORY_LABEL + '"');
        }
        if (!region) {
            return reportBroken('region-field-not-found',
                'no field "' + REGION_FIELD + '" / label "' + REGION_LABEL + '"');
        }
        if (!region.uid || !region.vsel) {
            return reportBroken('region-control-not-recognised',
                'Region is no longer a vue-select dropdown');
        }

        regionUid = region.uid;

        const raw = readSelected(territory);
        const resolved = normaliseTerritory(raw);
        if (resolved === null) {
            return reportBroken('territory-value-unrecognised',
                'Territory reads "' + raw + '", which is not a known state');
        }
        currentTerritory = resolved;
        log('territory', raw || '(unset)', '->', resolved, '| region uid', regionUid);

        // The selected value is a <span>, not an input, so watch the DOM rather
        // than listening for change events.
        if (territoryWatcher) territoryWatcher.disconnect();
        territoryWatcher = new MutationObserver(() => {
            const next = normaliseTerritory(readSelected(territory));
            if (next !== null && next !== currentTerritory) {
                currentTerritory = next;
                log('territory changed ->', next);
            }
        });
        territoryWatcher.observe(territory.group, {
            childList: true, subtree: true, characterData: true
        });
    }

    function start() {
        watchForMenus();
        apply();

        // Prospect is a single-page app, so opening another record doesn't
        // re-run the script. Re-apply whenever the URL changes.
        let lastHref = location.href;
        setInterval(() => {
            if (location.href === lastHref) return;
            lastHref = location.href;
            reported.clear();
            regionUid = null;
            currentTerritory = '*';
            unhideAll();
            const banner = document.getElementById('sc-region-filter-banner');
            if (banner) banner.remove();
            apply();
        }, 500);
    }

    // Any unexpected error must not leave the dropdown half-filtered.
    try {
        start();
    } catch (err) {
        reportBroken('unexpected-error', err && err.message);
    }
})();
