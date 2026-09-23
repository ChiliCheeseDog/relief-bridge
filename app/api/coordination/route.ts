import { z } from "zod";
import { database, ensureExamples, readData } from "@/db/coordination";
import { catalog, regions } from "@/lib/relief";

export const dynamic = "force-dynamic";
const quantity = z.number().int().min(1).max(100000);
const item = z.enum(Object.keys(catalog) as [string, ...string[]]);
const shared = {
  organization: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(100),
  region: z.enum(regions),
  item,
  quantity,
};
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    ...shared,
    priority: z.enum(["Critical", "High", "Standard"]),
    notes: z.string().trim().max(600).default(""),
  }),
  z.object({ action: z.literal("supply"), ...shared }),
  z.object({
    action: z.literal("allocate"),
    requestId: z.string().min(1).max(80),
    supplyId: z.string().min(1).max(80),
    quantity,
  }),
  z.object({
    action: z.literal("status"),
    id: z.string().min(1).max(80),
    status: z.enum(["In transit", "Delivered"]),
  }),
]);
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status = 400) =>
  Response.json({ error }, { status, headers });
export async function GET() {
  try {
    await ensureExamples();
    return Response.json(await readData(), { headers });
  } catch (e) {
    console.error("Read coordination workspace:", e);
    return fail(
      "The workspace is unavailable. Please reconnect in a moment.",
      503,
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return fail("This request must come from this workspace.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail("Send a JSON request.", 415);
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 5000) return fail("This update is too large.", 413);
    raw = JSON.parse(text);
  } catch {
    return fail("This update is not valid JSON.");
  }
  const result = input.safeParse(raw);
  if (!result.success)
    return fail(
      "Check all fields. Enter a supported supply, region, and a whole quantity from 1 to 100,000.",
    );
  try {
    await ensureExamples();
    const db = database(),
      body = result.data,
      created = new Date().toISOString();
    if (body.action === "request") {
      await db
        .prepare(
          "INSERT INTO requests (id,clinic,location,region,item,quantity,priority,notes,created) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          `req-${crypto.randomUUID().slice(0, 8)}`,
          body.organization,
          body.location,
          body.region,
          body.item,
          body.quantity,
          body.priority,
          body.notes,
          created,
        )
        .run();
    } else if (body.action === "supply") {
      await db
        .prepare(
          "INSERT INTO supplies (id,donor,location,region,item,quantity,created) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(
          `sup-${crypto.randomUUID().slice(0, 8)}`,
          body.organization,
          body.location,
          body.region,
          body.item,
          body.quantity,
          created,
        )
        .run();
    } else if (body.action === "allocate") {
      // One conditional INSERT checks and reserves both sides atomically. Concurrent
      // coordinators cannot allocate stale stock or exceed the outstanding request.
      const allocation = await db
        .prepare(
          `INSERT INTO shipments (id,request_id,supply_id,quantity,status,created)
        SELECT ?,r.id,s.id,?,'Allocated',? FROM requests r JOIN supplies s ON r.item=s.item
        WHERE r.id=? AND s.id=?
          AND r.quantity-COALESCE((SELECT SUM(quantity) FROM shipments WHERE request_id=r.id),0)>=?
          AND s.quantity-COALESCE((SELECT SUM(quantity) FROM shipments WHERE supply_id=s.id),0)>=?`,
        )
        .bind(
          `RB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          body.quantity,
          created,
          body.requestId,
          body.supplyId,
          body.quantity,
          body.quantity,
        )
        .run();
      if (!allocation.meta.changes)
        return fail(
          "This match changed. Refresh to see the latest request and available stock.",
          409,
        );
    } else {
      const previous =
        body.status === "In transit" ? "Allocated" : "In transit";
      const update = await db
        .prepare("UPDATE shipments SET status=? WHERE id=? AND status=?")
        .bind(body.status, body.id, previous)
        .run();
      if (!update.meta.changes)
        return fail(
          "The shipment has already changed. Refresh to see its latest status.",
          409,
        );
    }
    return Response.json(await readData(), { headers });
  } catch (e) {
    console.error("Update coordination workspace:", e);
    return fail(
      "Your update could not be saved. Your form is preserved; please try again.",
      503,
    );
  }
}
