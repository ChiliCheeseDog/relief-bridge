import { z } from "zod";
import {
  available,
  catalog,
  regions,
  remaining,
  sample,
  type Item,
  type ReliefData,
} from "./relief";

// This adapter is only imported by the separate static test site. The live
// application continues to use /api/coordination and the D1 implementation.
const quantity = z.number().int().min(1).max(100000);
const item = z.enum(Object.keys(catalog) as [Item, ...Item[]]);
const location = z.string().trim().min(2).max(100);
const priority = z.enum(["Critical", "High", "Standard"]);
const shared = {
  organization: location,
  location,
  region: z.enum(regions),
  item,
  quantity,
};
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    ...shared,
    priority,
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
const recordFields = {
  id: z.string().min(1),
  location,
  region: z.enum(regions),
  item,
  quantity,
  created: z.string().datetime(),
};
const dataSchema = z.object({
  requests: z.array(z.object({
    ...recordFields,
    clinic: location,
    priority,
    notes: z.string().max(600),
  })),
  supplies: z.array(z.object({ ...recordFields, donor: location })),
  shipments: z.array(z.object({
    id: z.string().min(1),
    request_id: z.string().min(1),
    supply_id: z.string().min(1),
    quantity,
    status: z.enum(["Allocated", "In transit", "Delivered"]),
    created: z.string().datetime(),
  })),
});

export function updateDemoData(data: ReliefData, raw: unknown): ReliefData {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Check all fields. Use a supported item and region, and a whole quantity from 1 to 100,000.");
  }
  const body = parsed.data;
  const next = structuredClone(data);
  const created = new Date().toISOString();
  const suffix = crypto.randomUUID().slice(0, 8);
  if (body.action === "request") {
    next.requests.unshift({
      id: `req-${suffix}`,
      clinic: body.organization,
      location: body.location,
      region: body.region,
      item: body.item,
      quantity: body.quantity,
      priority: body.priority,
      notes: body.notes,
      created,
    });
  } else if (body.action === "supply") {
    next.supplies.unshift({
      id: `sup-${suffix}`,
      donor: body.organization,
      location: body.location,
      region: body.region,
      item: body.item,
      quantity: body.quantity,
      created,
    });
  } else if (body.action === "allocate") {
    const request = next.requests.find((record) => record.id === body.requestId);
    const supply = next.supplies.find((record) => record.id === body.supplyId);
    if (!request || !supply || request.item !== supply.item ||
        body.quantity > remaining(next, request) ||
        body.quantity > available(next, supply)) {
      throw new Error("This allocation exceeds the remaining request or available matching stock. Refresh and review the match.");
    }
    next.shipments.unshift({
      id: `RB-${suffix.toUpperCase()}`,
      request_id: request.id,
      supply_id: supply.id,
      quantity: body.quantity,
      status: "Allocated",
      created,
    });
  } else {
    const shipment = next.shipments.find((record) => record.id === body.id);
    const previous = body.status === "In transit" ? "Allocated" : "In transit";
    if (!shipment || shipment.status !== previous) {
      throw new Error("The shipment has already changed. Refresh to see its latest status.");
    }
    shipment.status = body.status;
  }
  return next;
}

type DemoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createDemoStore(
  storage: DemoStorage,
  key = "relief-bridge-public-demo-v1",
) {
  const read = (): ReliefData => {
    const raw = storage.getItem(key);
    if (!raw) return structuredClone(sample);
    const saved = dataSchema.safeParse(JSON.parse(raw));
    if (!saved.success) throw new Error("Saved test data could not be read. Use Reset demo data to restore the examples.");
    return saved.data;
  };
  return {
    read,
    reset() { storage.removeItem(key); },
    async transport(url: string, init?: RequestInit): Promise<Response> {
      if (url !== "/api/coordination") {
        return Response.json({ error: "Unknown test endpoint." }, { status: 404 });
      }
      try {
        const data = read();
        if (!init?.method || init.method === "GET") return Response.json(data);
        if (init.method !== "POST") return Response.json({ error: "Method not supported." }, { status: 405 });
        const next = updateDemoData(data, JSON.parse(String(init.body)));
        // Reading, validating and saving are synchronous so a second update in
        // this tab cannot reserve the same stock before the first one saves.
        storage.setItem(key, JSON.stringify(next));
        return Response.json(next);
      } catch (error) {
        return Response.json({
          error: error instanceof Error ? error.message : "Unable to save this browser's test data.",
        }, { status: 400 });
      }
    },
  };
}
