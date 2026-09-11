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

## Installing

The team's install list, covering this repo and the Margin Enquiry (Today) button in
[louis-foster/unleashed-userscripts](https://github.com/louis-foster/unleashed-userscripts),
is the Basecamp doc **Installing And Using Tampermonkey** (GarrettWalker Group HQ >
Technology). Point people there rather than here.

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click the raw script link for each one you want:
   - [view-past-unleashed-customer-orders.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/view-past-unleashed-customer-orders.user.js)
   - [edit-margin-enquiry-screen.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/edit-margin-enquiry-screen.user.js)
   - [outline-required-fields-on-an-unleashed-sales-order.user.js](https://github.com/sobercheck/tampermonkey-scripts/raw/main/outline-required-fields-on-an-unleashed-sales-order.user.js)
3. Tampermonkey will show an install page — click **Install**.
4. Open the relevant record. The past-orders script adds a **View Products** button to
   the customer record; the other two work invisibly until you run the Unit Sales Enquiry
   report or open a sales order.

Updates are automatic. Tampermonkey checks the `@updateURL` in the header periodically,
so bumping `@version` in this repo pushes the change to everyone.

### Already have Mathias's original version?

Just install from the links above. Each script keeps its original `@name` and
`@namespace`, so Tampermonkey recognises it as the same script and replaces it rather than
installing a second copy. If you skip this, your copy will keep updating from the old
personal repo instead of this one, and that repo only matches `au.unleashedsoftware.com`,
so the script never runs for anyone signed in through `go.unleashed.erp.accessacloud.com`.

## Maintaining

**Bump `@version` on every change.** Tampermonkey compares version numbers to decide
whether to update. Edit the file without bumping and nobody receives the change.

**`@updateURL` and `@downloadURL` must point at a real branch.** They currently reference
`raw/main`. If this repo's default branch is `master`, fix both lines or auto-update
silently 404s and users quietly stop receiving updates.

**The repo must stay public.** Tampermonkey fetches the raw file unauthenticated. Making
this repo private breaks updates for every installed user with no visible error.

**Adding another Unleashed tenancy** (e.g. a NZ or US region host): add a matching
`@match` line to the header of each Unleashed script. None of them hard-codes the host:
the past-orders script reads `window.location.origin`, so the report link is built against
whichever host it's running on, and the other two only touch the DOM. No other change is
needed. The Access-hosted tenant (`go.unleashed.erp.accessacloud.com`) is a CNAME alias of
`au.unleashedsoftware.com`, so the pages are identical.

**Debugging:** set `const DEBUG = true;` near the top of the script to trace what it's
doing in the browser console. It's off by default so it doesn't spam every user's console.

## Changelog

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
