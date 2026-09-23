"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
const DemoContext = createContext(false);
function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const demo = useContext(DemoContext);
  const href = demo && props.href?.startsWith("/")
    ? `#${props.href}`
    : props.href;
  return <a {...props} href={href} />;
}
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Package,
  Truck,
  Heart,
  Activity,
  MapPin,
  Search,
  Check,
  RefreshCw,
  ArrowDown,
  Link2,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useReliefTools } from "@/lib/use-relief-tools";
import {
  sample,
  catalog,
  regions,
  remaining,
  available,
  assigned,
  matches,
  donationUrl,
  type ReliefData,
  type RequestRecord,
} from "@/lib/relief";

type View = "overview" | "requests" | "inventory" | "shipments" | "about";
const navigation: [View, string, string][] = [
  ["overview", "Overview", "/"],
  ["requests", "Requests", "/requests"],
  ["inventory", "Supply inventory", "/inventory"],
  ["shipments", "Shipments", "/shipments"],
];
const labels = {
  overview: "Response overview",
  requests: "Clinic requests",
  inventory: "Supply inventory",
  shipments: "Shipment tracking",
  about: "About Relief Bridge",
};
function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="picker" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function ReliefApp({
  view,
  transport = fetch,
  demo = false,
  onResetDemo,
}: {
  view: View;
  transport?: (url: string, init?: RequestInit) => Promise<Response>;
  demo?: boolean;
  onResetDemo?: () => void;
}) {
  const [data, setData] = useState<ReliefData>(sample);
  const opener = useRef<HTMLElement | null>(null);
  const hasSynced = useRef(false);
  const revision = useRef(0);
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };
  const [connection, setConnection] = useState<
    "loading" | "connected" | "error"
  >("loading");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All regions");
  const [priority, setPriority] = useState("All priorities");
  useReliefTools(data, view, (f) => {
    setQuery(f.query);
    setRegion(f.region);
    setPriority(f.priority);
  });
  const [modal, setModal] = useState<"request" | "supply" | null>(null);
  const [detail, setDetail] = useState<RequestRecord | null>(null);
  const [menu, setMenu] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formItem, setFormItem] = useState<string>("Trauma kits");
  const [formRegion, setFormRegion] = useState<string>("North Carolina");
  const [formPriority, setFormPriority] = useState("High");
  async function refresh() {
    const version = revision.current;
    try {
      const r = await transport("/api/coordination", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const next = (await r.json()) as ReliefData;
      if (version !== revision.current) return;
      setData(next);
      hasSynced.current = true;
      setConnection("connected");
    } catch {
      setConnection("error");
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, []);
  async function action(body: object) {
    revision.current++;
    setBusy(true);
    setError("");
    try {
      const res = await transport("/api/coordination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await res.json()) as ReliefData & { error?: string };
      if (!res.ok)
        throw new Error(
          result.error || "We could not save this update. Please try again.",
        );
      setData(result);
      setConnection("connected");
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
      return false;
    } finally {
      revision.current++;
      setBusy(false);
    }
  }
  const active = data.requests.filter((r) => remaining(data, r) > 0);
  const filtered = (view === "requests" ? data.requests : active)
    .filter(
      (r) =>
        (region === "All regions" || r.region === region) &&
        (priority === "All priorities" || r.priority === priority) &&
        `${r.clinic} ${r.location} ${r.item}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        ["Critical", "High", "Standard"].indexOf(a.priority) -
        ["Critical", "High", "Standard"].indexOf(b.priority),
    );
  const critical = active.filter((r) => r.priority === "Critical").length;
  const actionable = active.filter((r) => matches(data, r).length);
  const candidate = actionable[0];
  const detailCurrent = detail
    ? data.requests.find((r) => r.id === detail.id) || detail
    : null;
  const options = detailCurrent ? matches(data, detailCurrent) : [];
  const chosen = options.find((s) => s.id === selectedSupply);
  function openRequest(r: RequestRecord) {
    setError("");
    setSelectedSupply(matches(data, r)[0]?.id || "");
    opener.current = document.activeElement as HTMLElement;
    setDetail(r);
  }
  function openForm(kind: "request" | "supply") {
    setError("");
    opener.current = document.activeElement as HTMLElement;
    setModal(kind);
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await action({
      action: modal,
      organization: f.get("organization"),
      location: f.get("location"),
      region: formRegion,
      item: formItem,
      quantity: Number(f.get("quantity")),
      priority: formPriority,
      notes: f.get("notes") || "",
    });
    if (ok) {
      setModal(null);
      toast.success(
        modal === "request"
          ? "Request added. Matching supplies are ready to review."
          : "Supply donation added to the inventory.",
      );
    }
  }
  return (
    <DemoContext.Provider value={demo}>
    <div className="site-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="notice">
        <span>
          <span className="notice-dot" /> DEMONSTRATION WORKSPACE
        </span>
        <span>
          {demo
            ? "Test data stays in this browser only. "
            : "Fictional records. Real coordination possibilities. "}
          <Link href="/about">
            About this project <ArrowUpRight size={13} />
          </Link>
          {demo && onResetDemo && (
            <button className="demo-reset" onClick={onResetDemo}>Reset demo data</button>
          )}
        </span>
      </div>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Relief Bridge home">
          <span className="brand-mark">
            <Plus size={29} strokeWidth={3} />
          </span>
          <span>
            Relief<span className="brand-light">Bridge</span>
            <small>CARE, CONNECTED.</small>
          </span>
        </Link>
        <nav aria-label="Main navigation" className={menu ? "nav open" : "nav"}>
          {navigation.map(([key, label, href]) => (
            <Link
              key={key}
              href={href}
              aria-current={view === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <a
          className="support-link"
          href={donationUrl}
          target="_blank"
          rel="noreferrer"
        >
          Support relief <ArrowUpRight size={17} />
        </a>
        <button
          className="mobile-menu"
          aria-label={menu ? "Close menu" : "Open menu"}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main id="main" className="main-wrap">
        <div className="page-heading">
          <div>
            <p className="eyebrow">THE COORDINATION DESK</p>
            <h1>{labels[view]}</h1>
          </div>
          <div className="sync">
            <span className={"sync-dot " + connection} />
            <span>
              {connection === "connected"
                ? demo ? "Saved in this browser" : "Synced · updates every 15s"
                : connection === "loading"
                  ? demo ? "Loading browser data" : "Connecting to workspace"
                  : demo ? "Browser storage unavailable"
                  : hasSynced.current
                    ? "Offline · last synced data"
                    : "Offline · sample preview"}
            </span>
            <button aria-label="Refresh data" onClick={() => void refresh()}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        {view === "overview" && (
          <section className="intro">
            <div className="intro-copy">
              <div className="eyebrow light">WHEN EVERY MOMENT MATTERS</div>
              <h2>
                The right supplies.
                <br />
                The right place. <em>Now.</em>
              </h2>
              <p>
                Connect generosity to urgent need.
                <br />
                Help frontline teams keep care moving.
              </p>
              <div className="intro-actions">
                <button
                  className="button button-white"
                  onClick={() => openForm("request")}
                >
                  Request supplies <Plus size={17} />
                </button>
                <button
                  className="text-button"
                  onClick={() => openForm("supply")}
                >
                  Offer supplies <ArrowUpRight size={17} />
                </button>
              </div>
            </div>
            <div className="intro-image">
              <img
                src={demo ? "./relief-team.jpg" : "/relief-team.jpg"}
                alt="Volunteers organizing humanitarian and medical supplies in a warehouse"
              />
              <div className="image-label">
                <span className="image-rule" />
                Care begins with connection.
              </div>
            </div>
          </section>
        )}
        {view === "overview" && (
          <section className="metrics" aria-label="Response metrics">
            <div>
              <span className="metric-label">
                <Activity size={17} /> Open requests
              </span>
              <strong key={active.length}>
                {active.length.toString().padStart(2, "0")}
              </strong>
              <span className="metric-note">
                <b>{critical} critical</b> needs awaiting support
              </span>
            </div>
            <div>
              <span className="metric-label">
                <Package size={17} /> Supplies available
              </span>
              <strong key={data.supplies.length}>
                {data.supplies
                  .filter((s) => available(data, s) > 0)
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
              <span className="metric-note">Donation lots ready to match</span>
            </div>
            <div>
              <span className="metric-label">
                <Link2 size={17} /> Requests with matches
              </span>
              <strong>{actionable.length.toString().padStart(2, "0")}</strong>
              <span className="metric-note">
                Compatible supplies identified
              </span>
            </div>
            <div>
              <span className="metric-label">
                <Truck size={17} /> Shipments in motion
              </span>
              <strong>
                {data.shipments
                  .filter((s) => s.status !== "Delivered")
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
              <span className="metric-note">
                From a helping hand to the front line
              </span>
            </div>
          </section>
        )}
        {connection === "error" && (
          <div className="connection-warning" role="status">
            {demo
              ? "Browser storage is unavailable. Enable site storage to save test records. "
              : "The shared workspace is temporarily unavailable. Saving is paused until the connection returns. "}
            <button onClick={() => void refresh()}>Reconnect</button>
          </div>
        )}
        {(view === "overview" || view === "requests") && (
          <div
            className={
              view === "overview" ? "workspace-grid" : "single-workspace"
            }
          >
            <section className="requests-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {view === "overview"
                      ? "PRIORITY RESPONSE"
                      : "RESOURCE REQUESTS"}
                  </p>
                  <h2>
                    {view === "overview"
                      ? "Where help is needed"
                      : "Every need, in view."}
                  </h2>
                </div>
                {view === "overview" ? (
                  <Link className="arrow-link" href="/requests">
                    All requests <ArrowUpRight size={17} />
                  </Link>
                ) : (
                  <button
                    className="button"
                    onClick={() => openForm("request")}
                  >
                    <Plus size={16} /> New request
                  </button>
                )}
              </div>
              <div className="filters">
                <label className="search">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search clinics or supplies"
                    aria-label="Search clinics or supplies"
                  />
                </label>
                <Picker
                  label="Filter by region"
                  value={region}
                  onChange={setRegion}
                  options={["All regions", ...regions]}
                />
                <Picker
                  label="Filter by priority"
                  value={priority}
                  onChange={setPriority}
                  options={["All priorities", "Critical", "High", "Standard"]}
                />
              </div>
              <div className="request-list">
                {filtered
                  .slice(0, view === "overview" ? 3 : undefined)
                  .map((r) => (
                    <article key={r.id} className="request-card">
                      <div className="request-card-top">
                        <span className={"badge " + r.priority.toLowerCase()}>
                          {r.priority === "Critical" && <span />}
                          {r.priority}
                        </span>
                        <span className="request-id">{r.id.toUpperCase()}</span>
                      </div>
                      <div className="request-body">
                        <div className="supply-icon">
                          <Package size={23} />
                        </div>
                        <div className="request-description">
                          <h3>{r.item}</h3>
                          <p>{r.clinic}</p>
                          <span className="location">
                            <MapPin size={13} />
                            {r.location}
                          </span>
                        </div>
                        <div className="quantity">
                          <strong>{remaining(data, r)}</strong>
                          <span>{catalog[r.item].unit} needed</span>
                        </div>
                      </div>
                      <div className="request-bottom">
                        <div className="request-progress">
                          <span>
                            {assigned(data, r.id)} of {r.quantity}{" "}
                            {catalog[r.item].unit} allocated
                          </span>
                          <Progress
                            aria-label={`${r.item} allocation`}
                            value={(assigned(data, r.id) / r.quantity) * 100}
                          />
                        </div>
                        <button
                          className="arrow-link"
                          onClick={() => openRequest(r)}
                        >
                          {remaining(data, r) === 0
                            ? "View progress"
                            : "Review matches"}
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <Search />
                    <h3>No matching requests</h3>
                    <p>Try another clinic, item, region, or priority.</p>
                    <button
                      className="arrow-link"
                      onClick={() => {
                        setQuery("");
                        setRegion("All regions");
                        setPriority("All priorities");
                      }}
                    >
                      Clear filters <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              {view === "overview" && (
                <Link href="/requests" className="all-requests">
                  Explore all {active.length} open requests{" "}
                  <ArrowRight size={18} />
                </Link>
              )}
            </section>
            {view === "overview" && (
              <aside className="response-aside">
                <section className="match-panel">
                  <div className="match-heading">
                    <span className="eyebrow light">MAKE THE CONNECTION</span>
                    <Link2 size={19} />
                  </div>
                  <h2>
                    A match can
                    <br />
                    make a difference.
                  </h2>
                  <p>
                    Available donations, connected to the clinics that need
                    them.
                  </p>
                  {candidate && (
                    <div className="match-preview">
                      <div>
                        <span className="tiny-label">AVAILABLE SUPPLY</span>
                        <h3>{matches(data, candidate)[0].donor}</h3>
                        <span>
                          {available(data, matches(data, candidate)[0])}{" "}
                          {catalog[candidate.item].unit} · {candidate.item}
                        </span>
                      </div>
                      <div className="connection-line">
                        <span />
                        <ArrowDown size={17} />
                        <span />
                      </div>
                      <div>
                        <span className="tiny-label">CLINIC IN NEED</span>
                        <h3>{candidate.clinic}</h3>
                        <span>{candidate.location}</span>
                      </div>
                    </div>
                  )}
                  <button
                    className="button button-white full"
                    disabled={!candidate}
                    onClick={() => candidate && openRequest(candidate)}
                  >
                    {candidate
                      ? "Review this match"
                      : active.length
                        ? "No matching stock available"
                        : "All needs are allocated"}
                    <ArrowRight size={17} />
                  </button>
                  <div className="match-foot">
                    <ShieldCheck size={14} /> You review every allocation.
                  </div>
                </section>
                <section className="support-card">
                  <Heart size={23} />
                  <p className="eyebrow">TAKE YOUR IMPACT FURTHER</p>
                  <h3>
                    Help care reach
                    <br />
                    more people.
                  </h3>
                  <p>
                    Support Direct Relief’s mission to improve the health and
                    lives of people affected by poverty or emergencies.
                  </p>
                  <a
                    href={donationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="arrow-link"
                  >
                    Give to Direct Relief <ArrowUpRight size={18} />
                  </a>
                  <small>Opens Direct Relief’s donation page.</small>
                </section>
              </aside>
            )}
          </div>
        )}
        {view === "inventory" && (
          <section className="inventory-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DONATIONS THAT MAKE A DIFFERENCE</p>
                <h2>Ready for the front line.</h2>
              </div>
              <button className="button" onClick={() => openForm("supply")}>
                <Plus size={17} /> Offer supplies
              </button>
            </div>
            <div className="filters">
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Search inventory"
                  placeholder="Search supplies or donors"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <Picker
                label="Inventory region"
                value={region}
                onChange={setRegion}
                options={["All regions", ...regions]}
              />
            </div>
            <div className="inventory-grid">
              {data.supplies
                .filter(
                  (s) =>
                    (region === "All regions" || s.region === region) &&
                    `${s.item} ${s.donor}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((s) => (
                  <article className="inventory-card" key={s.id}>
                    <div className="inventory-top">
                      <span className="supply-icon">
                        <Package size={24} />
                      </span>
                      <span
                        className={
                          "badge " + (available(data, s) ? "standard" : "high")
                        }
                      >
                        {available(data, s) ? "Available" : "Fully allocated"}
                      </span>
                    </div>
                    <p className="eyebrow">{catalog[s.item].category}</p>
                    <h3>{s.item}</h3>
                    <p>{s.donor}</p>
                    <span className="location">
                      <MapPin size={14} />
                      {s.location}
                    </span>
                    <div className="inventory-count">
                      <strong>{available(data, s)}</strong>
                      <span>{catalog[s.item].unit} available</span>
                    </div>
                    <Progress
                      aria-label={`${s.item} remaining inventory`}
                      value={(available(data, s) / s.quantity) * 100}
                    />
                    <div className="inventory-footer">
                      <span>
                        {s.quantity - available(data, s)} allocated /{" "}
                        {s.quantity} donated
                      </span>
                      <Link
                        href="/requests"
                        aria-label={`Find requests for ${s.item}`}
                      >
                        <ArrowUpRight size={21} />
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
            {!data.supplies.some(
              (s) =>
                (region === "All regions" || s.region === region) &&
                `${s.item} ${s.donor}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            ) && (
              <div className="empty-state">
                <Package />
                <h3>No supplies found</h3>
                <p>Try a different search or region.</p>
              </div>
            )}
          </section>
        )}
        {(view === "overview" || view === "shipments") && (
          <section className="shipments-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE JOURNEY TO CARE</p>
                <h2>
                  {view === "overview"
                    ? "Relief on the move"
                    : "Follow every delivery."}
                </h2>
              </div>
              {view === "overview" && (
                <Link href="/shipments" className="arrow-link">
                  Track shipments <ArrowUpRight size={17} />
                </Link>
              )}
            </div>
            <div className="shipment-list">
              {data.shipments
                .slice()
                .reverse()
                .slice(0, view === "overview" ? 2 : undefined)
                .map((s) => {
                  const r = data.requests.find((v) => v.id === s.request_id)!;
                  const supply = data.supplies.find(
                    (v) => v.id === s.supply_id,
                  )!;
                  return (
                    <article key={s.id} className="shipment-row">
                      <div
                        className={
                          "shipment-icon " +
                          (s.status === "Delivered" ? "delivered" : "")
                        }
                      >
                        {s.status === "Delivered" ? (
                          <Check size={21} />
                        ) : (
                          <Truck size={23} />
                        )}
                      </div>
                      <div className="shipment-description">
                        <span className="request-id">{s.id}</span>
                        <h3>
                          {r.item}{" "}
                          <span>
                            · {s.quantity} {catalog[r.item].unit}
                          </span>
                        </h3>
                        <p>
                          {supply.location} <ArrowRight size={13} />{" "}
                          {r.location}
                        </p>
                      </div>
                      <div
                        className="shipment-steps"
                        aria-label={`Shipment status: ${s.status}`}
                      >
                        {["Allocated", "In transit", "Delivered"].map(
                          (step, i) => (
                            <span
                              key={step}
                              className={
                                i <=
                                [
                                  "Allocated",
                                  "In transit",
                                  "Delivered",
                                ].indexOf(s.status)
                                  ? "done"
                                  : ""
                              }
                            >
                              <i>
                                {i <
                                [
                                  "Allocated",
                                  "In transit",
                                  "Delivered",
                                ].indexOf(s.status) ? (
                                  <Check size={11} />
                                ) : null}
                              </i>
                              {step}
                            </span>
                          ),
                        )}
                      </div>
                      {view === "shipments" && s.status !== "Delivered" && (
                        <button
                          disabled={busy || connection !== "connected"}
                          className="button small"
                          onClick={async () => {
                            if (
                              await action({
                                action: "status",
                                id: s.id,
                                status:
                                  s.status === "Allocated"
                                    ? "In transit"
                                    : "Delivered",
                              })
                            )
                              toast.success(
                                s.status === "Allocated"
                                  ? "Shipment marked in transit."
                                  : "Delivery confirmed. Thank you for keeping care moving.",
                              );
                          }}
                        >
                          {s.status === "Allocated"
                            ? "Dispatch shipment"
                            : "Confirm delivery"}
                          <ArrowRight size={15} />
                        </button>
                      )}
                    </article>
                  );
                })}
              {data.shipments.length === 0 && (
                <div className="empty-state">
                  <Truck />
                  <h3>No shipments yet</h3>
                  <p>Allocate a supply match to start its journey.</p>
                  <Link href="/requests" className="arrow-link">
                    Review clinic requests <ArrowRight size={17} />
                  </Link>
                </div>
              )}
            </div>
            {view === "shipments" && error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </section>
        )}
        {view === "about" && (
          <section className="about-section">
            <div className="about-lead">
              <p className="eyebrow">OUR PURPOSE</p>
              <h2>
                Less waiting.
                <br />
                <em>More care.</em>
              </h2>
              <p>
                After a disaster, a clinic’s empty shelf and a donor’s full
                warehouse should be part of the same conversation. Relief Bridge
                brings those needs and resources together.
              </p>
              <p>
                This is an independent demonstration project. All clinics,
                donors, requests, and shipments are fictional. It is not
                affiliated with Direct Relief or Harvard University.
              </p>
              <a
                href={donationUrl}
                target="_blank"
                rel="noreferrer"
                className="button"
              >
                Support Direct Relief <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="about-details">
              <h3>From request to relief</h3>
              <ol>
                <li>
                  <b>01 · Share the need</b>
                  <p>
                    A clinic lists a medical supply, quantity, location, and
                    priority.
                  </p>
                </li>
                <li>
                  <b>02 · Connect the resources</b>
                  <p>
                    Donors list supplies. Matching compares the exact item and
                    available stock, with supplies in the same state shown
                    first.
                  </p>
                </li>
                <li>
                  <b>03 · Keep care moving</b>
                  <p>
                    A coordinator reviews and allocates the match, then tracks
                    it through dispatch and delivery.
                  </p>
                </li>
              </ol>
              <h3>Built for thoughtful coordination</h3>
              <p>
                {demo
                  ? "This public test site stores fictional records in your browser. Changes persist after refresh on this browser, but are not shared with other visitors. Reset demo data restores the original examples. Do not enter real patient or personal information. "
                  : "Updates sync every 15 seconds. "}
                Allocations reserve inventory
                immediately so the same donation cannot be promised twice.
                Matches are suggestions; coordinators must review quantities and
                suitability. This demonstration does not verify organizations or
                arrange transport.
              </p>
              <h3>Sources & acknowledgments</h3>
              <ul>
                <li>
                  <a
                    href="https://www.directrelief.org/about/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Direct Relief — mission and organization{" "}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.harvard.edu/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Harvard University — visual inspiration{" "}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
                <li>
                  <a
                    href="https://commons.wikimedia.org/wiki/File:Nova_Ukraine_team_preparing_humanitarian_and_medical_aid_supplies_in_warehouse_for_distribution_across_regions_of_Ukraine.jpg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photography: NUSF / Nova Ukraine · CC0{" "}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
              </ul>
              <p className="about-note">
                Photograph depicts Nova Ukraine volunteers and is used as an
                illustration of relief work. It does not depict this
                demonstration’s clinics or imply a partnership.
              </p>
            </div>
          </section>
        )}
      </main>
      <footer className="footer">
        <Link href="/" className="footer-brand">
          <Plus size={20} strokeWidth={3} /> ReliefBridge
        </Link>
        <span>Connecting resources. Restoring possibility.</span>
        <Link href="/about">
          About & sources <ArrowUpRight size={14} />
        </Link>
        <span className="footer-demo">A disaster response demonstration</span>
      </footer>
      <Dialog
        open={!!modal}
        onOpenChange={(open) => {
          if (!open && !busy) setModal(null);
        }}
      >
        <DialogContent
          className="relief-dialog"
          onCloseAutoFocus={restoreFocus}
        >
          <DialogTitle>
            {modal === "request"
              ? "Tell us what’s needed."
              : "Put your supplies to work."}
          </DialogTitle>
          <DialogDescription>
            {modal === "request"
              ? "Share a clinic shortage to find matching donations."
              : "List a donation for clinics to match with their needs."}{" "}
            Records are saved to this demonstration workspace.
          </DialogDescription>
          <form onSubmit={submit} className="relief-form">
            <label>
              {modal === "request"
                ? "Clinic or response team"
                : "Donor organization"}
              <input
                name="organization"
                required
                maxLength={100}
                placeholder={
                  modal === "request"
                    ? "e.g. Community Care Clinic"
                    : "e.g. Community Relief Foundation"
                }
              />
            </label>
            <div className="form-columns">
              <label>
                City and state
                <input
                  name="location"
                  required
                  maxLength={100}
                  placeholder="e.g. Asheville, NC"
                />
              </label>
              <label>
                State
                <Picker
                  label="State"
                  value={formRegion}
                  onChange={setFormRegion}
                  options={[...regions]}
                />
              </label>
            </div>
            <label>
              Medical supply
              <Picker
                label="Medical supply"
                value={formItem}
                onChange={setFormItem}
                options={Object.keys(catalog)}
              />
            </label>
            <div className="form-columns">
              <label>
                Quantity ({catalog[formItem as keyof typeof catalog].unit})
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  required
                  placeholder="e.g. 100"
                />
              </label>
              {modal === "request" && (
                <label>
                  Priority
                  <Picker
                    label="Priority"
                    value={formPriority}
                    onChange={setFormPriority}
                    options={["Critical", "High", "Standard"]}
                  />
                </label>
              )}
            </div>
            {modal === "request" && (
              <label>
                Requirements <span>(optional)</span>
                <textarea
                  name="notes"
                  maxLength={600}
                  placeholder="Packaging, specifications, or other coordination details."
                  rows={3}
                />
              </label>
            )}
            <div className="form-note">
              <ShieldCheck size={17} />
              <span>
                Use demonstration details only. No patient information.
              </span>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              disabled={busy || connection !== "connected"}
              className="button full"
              type="submit"
            >
              {busy
                ? "Saving…"
                : modal === "request"
                  ? "Submit request"
                  : "Add supply donation"}
              <ArrowRight size={17} />
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!detailCurrent}
        onOpenChange={(open) => {
          if (!open && !busy) setDetail(null);
        }}
      >
        <DialogContent
          className="relief-dialog match-dialog"
          onCloseAutoFocus={restoreFocus}
        >
          {detailCurrent && (
            <>
              <span className={"badge " + detailCurrent.priority.toLowerCase()}>
                {detailCurrent.priority} priority
              </span>
              <DialogTitle>{detailCurrent.item}</DialogTitle>
              <DialogDescription>
                {detailCurrent.clinic} · {detailCurrent.location}
              </DialogDescription>
              <div className="detail-summary">
                <div>
                  <strong>{remaining(data, detailCurrent)}</strong>
                  <span>{catalog[detailCurrent.item].unit} still needed</span>
                </div>
                <div>
                  <strong>{assigned(data, detailCurrent.id)}</strong>
                  <span>already allocated</span>
                </div>
              </div>
              <p className="detail-notes">
                {detailCurrent.notes || "No additional requirements provided."}
              </p>
              {remaining(data, detailCurrent) > 0 ? (
                <>
                  <h3 className="match-subtitle">
                    {options.length} compatible donation
                    {options.length === 1 ? "" : "s"}
                  </h3>
                  <p className="detail-hint">
                    Exact supply matches. Same-state donors appear first.
                  </p>
                  {options.map((s) => (
                    <button
                      key={s.id}
                      className={
                        "donor-option " +
                        (chosen?.id === s.id ? "selected" : "")
                      }
                      aria-pressed={chosen?.id === s.id}
                      onClick={() => setSelectedSupply(s.id)}
                    >
                      <span className="donor-radio">
                        {chosen?.id === s.id && <Check size={12} />}
                      </span>
                      <span>
                        <b>{s.donor}</b>
                        <small>
                          {s.location}
                          {s.region === detailCurrent.region
                            ? " · Same state"
                            : ""}
                        </small>
                      </span>
                      <strong>
                        {available(data, s)}
                        <small>{catalog[s.item].unit}</small>
                      </strong>
                    </button>
                  ))}
                  {chosen ? (
                    <>
                      <div className="allocation-note">
                        Allocate{" "}
                        <b>
                          {Math.min(
                            remaining(data, detailCurrent),
                            available(data, chosen),
                          )}{" "}
                          {catalog[detailCurrent.item].unit}
                        </b>{" "}
                        from this donation. Inventory is reserved immediately.
                      </div>
                      <button
                        className="button full"
                        disabled={busy || connection !== "connected"}
                        onClick={async () => {
                          if (
                            await action({
                              action: "allocate",
                              requestId: detailCurrent.id,
                              supplyId: chosen.id,
                              quantity: Math.min(
                                remaining(data, detailCurrent),
                                available(data, chosen),
                              ),
                            })
                          ) {
                            setDetail(null);
                            toast.success(
                              "Match allocated. Your shipment is ready to dispatch.",
                            );
                          }
                        }}
                      >
                        {busy ? "Allocating…" : "Allocate supplies"}
                        <ArrowRight size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="empty-state">
                      <Package />
                      <p>
                        {options.length
                          ? "Select a donation above to continue."
                          : "No matching stock is available yet."}
                      </p>
                      <button
                        className="arrow-link"
                        onClick={() => {
                          setDetail(null);
                          setFormItem(detailCurrent.item);
                          openForm("supply");
                        }}
                      >
                        Offer matching supplies <ArrowUpRight size={17} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="allocation-complete">
                  <ShieldCheck />
                  <h3>Fully allocated</h3>
                  <p>Every requested unit has a supply allocation.</p>
                  <Link href="/shipments" className="arrow-link">
                    Follow the shipments <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Toaster position="bottom-right" theme="light" richColors closeButton />
    </div>
    </DemoContext.Provider>
  );
}
