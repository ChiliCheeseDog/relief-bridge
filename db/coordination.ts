import { env } from "cloudflare:workers";
import { sample, type ReliefData } from "@/lib/relief";

export function database(): D1Database {
  if (!env.DB) throw new Error("Coordination database is unavailable");
  return env.DB;
}

let seedTask: Promise<unknown> | undefined;
// Seed example records separately from schema migrations. IDs make retries safe.
export async function ensureExamples() {
  const db = database();
  seedTask ??= db
    .batch([
      ...sample.requests.map((r) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO requests (id,clinic,location,region,item,quantity,priority,notes,created) VALUES (?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            r.id,
            r.clinic,
            r.location,
            r.region,
            r.item,
            r.quantity,
            r.priority,
            r.notes,
            r.created,
          ),
      ),
      ...sample.supplies.map((s) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO supplies (id,donor,location,region,item,quantity,created) VALUES (?,?,?,?,?,?,?)",
          )
          .bind(
            s.id,
            s.donor,
            s.location,
            s.region,
            s.item,
            s.quantity,
            s.created,
          ),
      ),
      ...sample.shipments.map((s) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO shipments (id,request_id,supply_id,quantity,status,created) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            s.id,
            s.request_id,
            s.supply_id,
            s.quantity,
            s.status,
            s.created,
          ),
      ),
    ])
    .catch((e) => {
      seedTask = undefined;
      throw e;
    });
  await seedTask;
}

export async function readData(): Promise<ReliefData> {
  const db = database();
  const results = await db.batch([
    db.prepare("SELECT * FROM requests ORDER BY created DESC"),
    db.prepare("SELECT * FROM supplies ORDER BY created DESC"),
    db.prepare("SELECT * FROM shipments ORDER BY created ASC"),
  ]);
  return {
    requests: results[0].results,
    supplies: results[1].results,
    shipments: results[2].results,
  } as ReliefData;
}
