export const catalog = {
  "Trauma kits": { unit: "kits", category: "Emergency care" },
  "Nitrile gloves": { unit: "boxes", category: "Protective equipment" },
  "Wound dressings": { unit: "packs", category: "Wound care" },
  "First aid kits": { unit: "kits", category: "Emergency care" },
  "Surgical masks": { unit: "boxes", category: "Protective equipment" },
  "Emergency blankets": { unit: "blankets", category: "Patient care" },
} as const;
export type Item = keyof typeof catalog;
export const regions = ["North Carolina", "Florida", "Louisiana"] as const;
export type RequestRecord = {
  id: string;
  clinic: string;
  location: string;
  region: string;
  item: Item;
  quantity: number;
  priority: string;
  notes: string;
  created: string;
};
export type Supply = {
  id: string;
  donor: string;
  location: string;
  region: string;
  item: Item;
  quantity: number;
  created: string;
};
export type Shipment = {
  id: string;
  request_id: string;
  supply_id: string;
  quantity: number;
  status: string;
  created: string;
};
export type ReliefData = {
  requests: RequestRecord[];
  supplies: Supply[];
  shipments: Shipment[];
};
export const sample: ReliefData = {
  requests: [
    {
      id: "req-101",
      clinic: "Blue Ridge Community Clinic",
      location: "Asheville, NC",
      region: "North Carolina",
      item: "Trauma kits",
      quantity: 120,
      priority: "Critical",
      notes:
        "For the mobile response team serving communities with limited road access. Sealed, complete kits only.",
      created: "2026-09-23T09:30:00Z",
    },
    {
      id: "req-102",
      clinic: "Gulf Coast Medical Center",
      location: "Tampa, FL",
      region: "Florida",
      item: "Nitrile gloves",
      quantity: 300,
      priority: "High",
      notes:
        "Powder-free, non-latex examination gloves. Mixed sizes accepted. One box contains 100 gloves.",
      created: "2026-09-23T08:00:00Z",
    },
    {
      id: "req-103",
      clinic: "River Parish Health Clinic",
      location: "New Orleans, LA",
      region: "Louisiana",
      item: "Wound dressings",
      quantity: 200,
      priority: "Critical",
      notes:
        "Sterile dressings in intact packaging for our community care teams.",
      created: "2026-09-23T07:15:00Z",
    },
    {
      id: "req-104",
      clinic: "Mountain Hope Response Team",
      location: "Boone, NC",
      region: "North Carolina",
      item: "Emergency blankets",
      quantity: 150,
      priority: "High",
      notes:
        "Individually packaged thermal blankets for temporary care stations.",
      created: "2026-09-22T16:00:00Z",
    },
    {
      id: "req-105",
      clinic: "Suncoast Community Health",
      location: "Sarasota, FL",
      region: "Florida",
      item: "First aid kits",
      quantity: 80,
      priority: "Standard",
      notes: "Complete, sealed first aid kits for outreach volunteers.",
      created: "2026-09-22T12:00:00Z",
    },
    {
      id: "req-106",
      clinic: "Bayou Mobile Care",
      location: "Baton Rouge, LA",
      region: "Louisiana",
      item: "Surgical masks",
      quantity: 180,
      priority: "Standard",
      notes: "Disposable masks, 50 per box, in original packaging.",
      created: "2026-09-22T10:00:00Z",
    },
  ],
  supplies: [
    {
      id: "sup-101",
      donor: "Piedmont Supply Collective",
      location: "Charlotte, NC",
      region: "North Carolina",
      item: "Trauma kits",
      quantity: 100,
      created: "2026-09-23T10:00:00Z",
    },
    {
      id: "sup-102",
      donor: "Coastal Care Foundation",
      location: "Orlando, FL",
      region: "Florida",
      item: "Nitrile gloves",
      quantity: 500,
      created: "2026-09-23T09:00:00Z",
    },
    {
      id: "sup-103",
      donor: "Community Medical Partners",
      location: "Baton Rouge, LA",
      region: "Louisiana",
      item: "Wound dressings",
      quantity: 160,
      created: "2026-09-23T08:00:00Z",
    },
    {
      id: "sup-104",
      donor: "Carolina Relief Network",
      location: "Raleigh, NC",
      region: "North Carolina",
      item: "Emergency blankets",
      quantity: 250,
      created: "2026-09-22T15:00:00Z",
    },
    {
      id: "sup-105",
      donor: "Sunshine Volunteer Network",
      location: "Tampa, FL",
      region: "Florida",
      item: "First aid kits",
      quantity: 120,
      created: "2026-09-22T12:00:00Z",
    },
    {
      id: "sup-106",
      donor: "Gulf Medical Collective",
      location: "New Orleans, LA",
      region: "Louisiana",
      item: "Surgical masks",
      quantity: 300,
      created: "2026-09-22T09:00:00Z",
    },
  ],
  shipments: [
    {
      id: "RB-2041",
      request_id: "req-102",
      supply_id: "sup-102",
      quantity: 100,
      status: "In transit",
      created: "2026-09-23T10:00:00Z",
    },
    {
      id: "RB-2040",
      request_id: "req-103",
      supply_id: "sup-103",
      quantity: 60,
      status: "Delivered",
      created: "2026-09-22T09:00:00Z",
    },
  ],
};
export const assigned = (data: ReliefData, id: string) =>
  data.shipments
    .filter((s) => s.request_id === id)
    .reduce((sum, s) => sum + s.quantity, 0);
export const remaining = (data: ReliefData, r: RequestRecord) =>
  Math.max(0, r.quantity - assigned(data, r.id));
export const available = (data: ReliefData, s: Supply) =>
  Math.max(
    0,
    s.quantity -
      data.shipments
        .filter((v) => v.supply_id === s.id)
        .reduce((n, v) => n + v.quantity, 0),
  );
export function matches(data: ReliefData, r: RequestRecord) {
  return data.supplies
    .filter((s) => s.item === r.item && available(data, s) > 0)
    .sort(
      (a, b) =>
        Number(b.region === r.region) - Number(a.region === r.region) ||
        available(data, b) - available(data, a),
    );
}
export const donationUrl =
  "https://donate.directrelief.org/campaign/547693/donate";
