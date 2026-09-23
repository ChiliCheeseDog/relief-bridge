# Relief Bridge

## Open the website

Open the website link in your browser. If access is restricted, sign in with the account that owns the site.

To run the copy on this computer, open a terminal in this folder and run:

```sh
node scripts/run-framework.mjs dev
```

Open `http://localhost:5173`. Keep the terminal running while you use the website. Press `Ctrl+C` in the terminal when finished.

## Request medical supplies

1. Open **Requests** and select **New request**, or select **Request supplies** on the overview.
2. Enter the clinic name, city, state, medical supply, and quantity.
3. Select a priority and add any packaging or coordination requirements.
4. Select **Submit request**.

Quantities must be whole numbers between 1 and 100,000. Units are shown beside the quantity field. Use fictional details while testing; do not enter patient information.

## Offer supplies

1. Open **Supply inventory** and select **Offer supplies**.
2. Enter the donor organization, location, supply, and quantity.
3. Select **Add supply donation**.

Available stock appears in the inventory and becomes eligible for matching requests.

## Match a donation to a request

1. Open a request and select **Review matches**.
2. Review the clinic requirements and compatible donations.
3. Select a donor. Donations in the same state appear first.
4. Review the allocation quantity and select **Allocate supplies**.

Allocations reserve stock immediately. A donation cannot be allocated beyond its available quantity. A request cannot receive more than its requested quantity.

## Track a shipment

1. Open **Shipments**.
2. Select **Dispatch shipment** when an allocation leaves the donor.
3. Select **Confirm delivery** when it reaches the clinic.

Shipments progress through **Allocated**, **In transit**, and **Delivered**. Recording a status does not arrange real transportation.

## Search and filter

Use the search field to find clinics, donors, or supplies. Use the state and priority filters to narrow requests. **Clear filters** restores the full request list when no results match.

## Refresh and save

Records are saved automatically after a successful submission. The workspace refreshes every 15 seconds. Select the refresh icon beside the connection status to update immediately.

If the workspace is offline, saving pauses. Select **Reconnect** and try again. Keep the form open to preserve information that has not been saved.

## Support relief efforts

Select **Support relief** or **Give to Direct Relief** to open the external donation page. This website does not process payments.

## Set up a new local copy

Install Node.js 22.13 or later. In the project folder, run:

```sh
npm ci
node scripts/run-framework.mjs build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_handy_warpath.sql
node scripts/run-framework.mjs dev
```

Run the database initialization command only for a new local database. Example records are added automatically when the workspace first connects. Local testing records are separate from the hosted website's records.

## Test the workflow

Create a request, offer the same supply, allocate a match, dispatch it, and confirm delivery. Reload the page to confirm that the records remain saved. Test searching, filtering, and narrow browser widths as well.
