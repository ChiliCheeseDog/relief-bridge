import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
const origin = process.argv[2] || "http://localhost:5173";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw Error("Smoke tests must use a local demonstration database.");
const created = { requests: [], supplies: [], shipments: [] };
async function post(body, status = 200) {
  const response = await fetch(`${origin}/api/coordination`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
try {
  const first = await (await fetch(`${origin}/api/coordination`)).json();
  assert.ok(first.requests.length >= 6);
  assert.ok(first.supplies.length >= 6);
  const body = {
    organization: "QA Test Clinic",
    location: "Asheville, NC",
    region: "North Carolina",
    item: "First aid kits",
    quantity: 7,
    priority: "Critical",
    notes: "Local test only",
  };
  await post({ ...body, action: "request", quantity: 0 }, 400);
  await post({ ...body, action: "request", quantity: 1.5 }, 400);
  await post({ ...body, action: "request", item: "Unsupported supply" }, 400);
  let data = await post({ ...body, action: "request" });
  const request = data.requests.find(
    (r) => !first.requests.some((a) => a.id === r.id),
  );
  assert.ok(request);
  created.requests.push(request.id);
  const before = data;
  data = await post({
    ...body,
    action: "supply",
    organization: "QA Test Donor",
    quantity: 5,
  });
  const supply = data.supplies.find(
    (s) => !before.supplies.some((a) => a.id === s.id),
  );
  assert.ok(supply);
  created.supplies.push(supply.id);
  await post(
    {
      action: "allocate",
      requestId: request.id,
      supplyId: supply.id,
      quantity: 6,
    },
    409,
  );
  const mismatch = first.supplies.find((s) => s.item !== request.item);
  await post(
    {
      action: "allocate",
      requestId: request.id,
      supplyId: mismatch.id,
      quantity: 1,
    },
    409,
  );
  const allocations = await Promise.all(
    [0, 1].map(() =>
      fetch(`${origin}/api/coordination`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({
          action: "allocate",
          requestId: request.id,
          supplyId: supply.id,
          quantity: 5,
        }),
      }),
    ),
  );
  assert.deepEqual(allocations.map((r) => r.status).sort(), [200, 409]);
  data = await (await fetch(`${origin}/api/coordination`)).json();
  const shipment = data.shipments.find((s) => s.request_id === request.id);
  assert.ok(shipment);
  created.shipments.push(shipment.id);
  assert.equal(
    data.shipments
      .filter((s) => s.supply_id === supply.id)
      .reduce((n, s) => n + s.quantity, 0),
    5,
  );
  await post({ action: "status", id: shipment.id, status: "Delivered" }, 409);
  await post({ action: "status", id: shipment.id, status: "In transit" });
  data = await post({ action: "status", id: shipment.id, status: "Delivered" });
  assert.equal(
    data.shipments.find((s) => s.id === shipment.id).status,
    "Delivered",
  );
  const persisted = await (await fetch(`${origin}/api/coordination`)).json();
  assert.equal(
    persisted.shipments.find((s) => s.id === shipment.id).status,
    "Delivered",
  );
  for (const path of ["/", "/requests", "/inventory", "/shipments", "/about"])
    assert.equal((await fetch(origin + path)).status, 200, path);
  console.log(
    "PASS: all 5 routes, persistent creation, invalid input, exact-item matching, concurrent allocation protection, inventory totals, ordered shipment transitions, and persisted delivery.",
  );
} finally {
  mkdirSync(".sites-runtime", { recursive: true });
  const statements = Object.entries(created)
    .reverse()
    .flatMap(([table, ids]) =>
      ids.map((id) => {
        assert.match(id, /^[a-zA-Z0-9-]+$/);
        return `DELETE FROM ${table} WHERE id='${id}';`;
      }),
    );
  writeFileSync(".sites-runtime/qa-cleanup.sql", statements.join("\n"));
}
