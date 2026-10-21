# Sober Check Tampermonkey scripts

Browser userscripts that add small quality-of-life features to the tools we use daily.

## Scripts

### View past Unleashed customer orders

Adds a **View Products** button to the Unleashed customer page. Clicking it opens the
Unit Sales Enquiry report for that customer, covering a rolling 12 months and including
credits — so you can see what they've actually been buying, broken down by product,
without building the report by hand every time.

Works on both `au.unleashedsoftware.com` and `go.unleashed.erp.accessacloud.com`.

### Edit margin enquiry screen

Despite the name, this runs on the **Unit Sales Enquiry** report, which is the screen the
View Products button opens. After you click Run it shades every numeric cell: green where
the customer bought something, pink where the value is blank or zero, so the point at
which they stopped ordering a product stands out.

Works on both `au.unleashedsoftware.com` and `go.unleashed.erp.accessacloud.com`.

### Outline required fields on an Unleashed sales order

On a sales order, draws a red border around the Customer Reference, Delivery Method and
delivery address while they are empty, and clears it once they are filled in. It also
pops a reminder to offer two-day shipping when a New Zealand South Island postcode is
entered without a two-day courier selected.

Works on both `au.unleashedsoftware.com` and `go.unleashed.erp.accessacloud.com`.

### Prospect 365 — filter Region by Territory

Prospect 365 has no dependent/cascading dropdowns: the Region list is flat, so every
region for every state shows up regardless of which Territory is set. This script narrows
it — pick `WA` as the Territory and only the WA regions remain selectable.

**It reads the state out of the region's own name**, so adding a region in Prospect needs
no change to the script. Both naming styles work:

| Region option | Resolves to |
|---|---|
| `Pilbara (WA)` | WA |
| `WA - Pilbara` | WA |
| `QLD – Far North` | QLD |
| `ACT: Canberra` | ACT |
| `Greater Sydney` | *(unknown — always shown)* |

Behaviour worth knowing:

- **It fails open.** Anything it can't parse stays visible, and if the script breaks it
  restores the full list rather than leaving you stuck. It never blocks a selection.
- **Territory `Australia-wide` shows everything.** So does a blank Territory (`[None]`).
- **`[None]` and `Configure...` are never hidden.** Prospect adds both to every dropdown;
  neither parses to a state, so both always survive filtering.
- **A state with no regions shows the full list.** Right now only WA regions exist, so
  opening a QLD or NSW company still shows everything — there's nothing to narrow to. That
  is a note in the console, not a warning, because it's a gap in the data rather than a
  broken script. See `WARN_WHEN_TERRITORY_HAS_NO_REGIONS` below.
- **It tells you when it actually breaks.** See below.

**One known limitation:** hidden options are hidden visually, but vue-select still counts
them when you arrow up and down the list, so the highlight can land on a blank row. Typing
to search, and clicking, both behave correctly. Removing the elements outright would fight
Vue's rendering, so this is a deliberate trade.

#### How it finds the fields

Prospect labels each field's input with the underlying API field name plus a volatile
layout id — `DivisionXtra.StandardDropdownField1_287` for Region, `Territory_285` for
Territory. The script matches on the stable prefix and ignores the number, which changes
on every page load.

The dropdowns are [vue-select](https://vue-select.org/). When one opens, its menu is
appended to `<body>` rather than sitting inside the field, so the two are linked by
vue-select's instance id: the field's toggle is `vs3__combobox` and its options are
`vs3__option-0`, `vs3__option-1`… The script reads that id off the field and uses it to
recognise the right menu.

#### When it breaks

Prospect is a third-party SPA and its markup changes without notice. When the script can
no longer find what it needs it does three things:

1. Restores the full, unfiltered region list.
2. Shows a red banner across the top of the record: *"Region filtering is off — the full
   region list is showing, so check the state matches the Territory before saving."*
3. Fires a desktop notification, at most once every 12 hours per fault so it doesn't nag
   on every record you open.

The banner and notification both carry a fault code:

| Code | Meaning |
|---|---|
| `territory-field-not-found` | No `Territory` field on the record — removed from the layout, or the field name changed |
| `region-field-not-found` | Same for `Region` — most likely it was moved to a different custom dropdown slot |
| `region-control-not-recognised` | The Region field is there but is no longer a vue-select dropdown — Prospect changed its UI framework |
| `territory-value-unrecognised` | Territory holds something that isn't an Australian state |
| `no-regions-for-territory` | That state has no regions configured. **Off by default** — see `WARN_WHEN_TERRITORY_HAS_NO_REGIONS` |
| `unexpected-error` | Anything else; check the browser console |

## Installing

The team's install list, covering this repo and the Margin Enquiry (Today) button in
[louis-foster/unleashed-userscripts](https://github.com/louis-foster/unleashed-userscripts),
is the Basecamp doc **Installing And Using Tampermonkey** (GarrettWalker Group HQ >
Technology). Point people there rather than here.

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click the raw script link for the one you want:
   - [view-past-unleashed-customer-orders.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/view-past-unleashed-customer-orders.user.js)
   - [edit-margin-enquiry-screen.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/edit-margin-enquiry-screen.user.js)
   - [outline-required-fields-on-an-unleashed-sales-order.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/outline-required-fields-on-an-unleashed-sales-order.user.js)
   - [prospect365-region-by-territory.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/prospect365-region-by-territory.user.js)
3. Tampermonkey will show an install page — click **Install**.
4. Open the relevant record. The past-orders script adds a **View Products** button to
   the customer record; the other Unleashed scripts and the Prospect script work invisibly
   until you run the Unit Sales Enquiry report, open a sales order, or open the Region
   dropdown.

The Prospect script asks for notification permission the first time it needs to warn you.
Allow it, or you'll only get the in-page banner.

Updates are automatic. Tampermonkey checks the `@updateURL` in the header periodically,
so bumping `@version` in this repo pushes the change to everyone.

### Already have Mathias's original Unleashed version?

Just install from the links above. Each script keeps its original `@name` and
`@namespace`, so Tampermonkey recognises it as the same script and replaces it rather than
installing a second copy. If you skip this, your copy will keep updating from the old
personal repo instead of this one, and that repo only matches `au.unleashedsoftware.com`,
so the script never runs for anyone signed in through `go.unleashed.erp.accessacloud.com`.

## Maintaining

**Bump `@version` on every change.** Tampermonkey compares version numbers to decide
whether to update. Edit a file without bumping and nobody receives the change.

**`@updateURL` and `@downloadURL` must point at a real branch.** They currently reference
`raw/main`. If this repo's default branch is `master`, fix both lines or auto-update
silently 404s and users quietly stop receiving updates.

**The repo must stay public.** Tampermonkey fetches the raw file unauthenticated. Making
this repo private breaks updates for every installed user with no visible error.

**Debugging:** set `const DEBUG = true;` near the top of either script to trace what it's
doing in the browser console. Off by default so it doesn't spam every user's console.

### Unleashed script

**Adding another Unleashed tenancy** (e.g. a NZ or US region host): add a matching
`@match` line to the header of each Unleashed script. None of them hard-codes the host:
the past-orders script reads `window.location.origin`, so the report link is built against
whichever host it's running on, and the other two only touch the DOM. No other change is
needed. The Access-hosted tenant (`go.unleashed.erp.accessacloud.com`) is a CNAME alias of
`au.unleashedsoftware.com`, so the pages are identical.

### Prospect script

**Adding a new region:** nothing to change here. Add it in Prospect with the state in its
name (`NSW - Hunter` or `Hunter (NSW)`) and the script picks it up. A region whose name
carries no state is always shown, whatever the Territory.

**A region that genuinely can't carry its state in the name:** add it to
`REGION_OVERRIDES` at the top of the script.

**Once every state has regions:** set `WARN_WHEN_TERRITORY_HAS_NO_REGIONS = true`. Until
then it stays off, or every non-WA company would raise a false alarm. With it on, a state
that suddenly has no regions is a genuine signal that someone added regions without the
state in the name.

**If Region moves to a different custom dropdown slot:** update `REGION_FIELD`. The
current slots on the company record are:

| Field name | Label |
|---|---|
| `DivisionXtra.StandardDropdownField1` | Region |
| `DivisionXtra.StandardDropdownField2` | Current Supplier Alcohol |
| `DivisionXtra.StandardDropdownField3` | Current Supplier Drug Testing |
| `DivisionXtra.StandardDropdownField4` | Current Supplier Hydration |

Prospect allows five custom dropdowns per record type, so slot 5 is the only one spare.

**If the fields are only renamed** (not re-slotted), nothing needs changing — the script
keys off the field name, not the visible label. `TERRITORY_LABEL` / `REGION_LABEL` are
only a fallback for when the field name lookup fails, and are what the warning banner
calls the fields.

**Re-pinning after a Prospect UI change:** set `const DIAGNOSE = true;`, open a company
record, open the Region dropdown, then check the console. It dumps both fields' label,
control id and vue-select instance id, plus every option in the open menu and how it
parses — which is enough to work out what moved.

**Why it doesn't use CSS selectors:** Prospect ships generated class names that change
between releases. The script anchors on the API field name in the label's `for` attribute,
which is tied to the database column and so is about as stable as anything on the page.
That's also why it can't just be "fixed" with a new selector when it breaks — check
`DIAGNOSE` output first.

## Changelog

### Prospect 365 — filter Region by Territory

#### 0.2.0
- Validated against a live record on `crm.prospect365.com`. Three things were wrong in
  0.1.0 and are fixed:
  - The open dropdown menu is appended to `<body>`, not nested in the field, so the old
    code looked in the wrong place and would never have filtered anything. Fields and
    menus are now linked by vue-select's instance id.
  - `[None]` was read as an unrecognised territory and raised a false alarm on every
    record with no territory set. It now means "show everything".
  - The native `<select>` code path never applied — Prospect has no `<select>` elements
    on the record at all. Removed.
- Anchors on the API field name (`DivisionXtra.StandardDropdownField1`) instead of the
  visible label text, which survives a field being renamed in the layout editor.
- Handles Prospect's stacked record dialogs by taking the topmost visible field.
- Re-applies the filter as vue-select re-renders options while you type.
- `no-regions-for-territory` no longer raises the banner by default — with only WA
  regions configured, every non-WA company would have triggered it.

#### 0.1.0
- First version, written before the live DOM was inspected. Never released.

### Edit margin enquiry screen

#### 0.1.0
- Runs on `go.unleashed.erp.accessacloud.com` as well as `au.unleashedsoftware.com`.
- Pointed `@updateURL`/`@downloadURL` at this repo. The original had neither, so an
  installed copy could only ever be changed by reinstalling it.

#### 0.0.4
- Original version by Mathias Foster.

### Outline required fields on an Unleashed sales order

#### 0.15
- Runs on `go.unleashed.erp.accessacloud.com` as well as `au.unleashedsoftware.com`.
- Pointed `@updateURL`/`@downloadURL` at this repo. The original had neither, so an
  installed copy could only ever be changed by reinstalling it.

#### 0.14
- Original version by Mathias Foster.

### View past Unleashed customer orders

#### 0.5.0
- Wait for the page elements to render instead of assuming they exist, so the button
  reliably appears on slower loads rather than failing silently.
- Fixed customer codes containing more than one space producing a broken report link —
  only the first space was being escaped.
- Read the customer ID from the URL path so a query string or fragment can't corrupt it.
- Guard against inserting a second button if the script runs twice.
- Console logging now off by default behind a `DEBUG` flag.
- Removed unused date calculations.
- Pointed `@updateURL`/`@downloadURL` at this repo, and added `@downloadURL` (it was
  missing — Tampermonkey uses it to fetch the actual script body).

#### 0.4.0
- Original version by Mathias Foster.
