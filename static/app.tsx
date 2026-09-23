import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ReliefApp from "../components/relief-app";
import { createDemoStore } from "../lib/demo-store";

const store = createDemoStore({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});
const routes = {
  "/": "overview",
  "/requests": "requests",
  "/inventory": "inventory",
  "/shipments": "shipments",
  "/about": "about",
} as const;
const getView = () => routes[location.hash.slice(1) as keyof typeof routes] || "overview";

function PublicDemo() {
  const [view, setView] = useState(getView);
  const [revision, setRevision] = useState(0);
  const [resetError, setResetError] = useState("");
  useEffect(() => {
    const navigate = () => {
      // Preserve the accessibility skip link without treating it as a route.
      if (location.hash === "#main") return;
      setView(getView());
      window.scrollTo(0, 0);
    };
    const sync = () => setRevision((value) => value + 1);
    window.addEventListener("hashchange", navigate);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return <>
    {resetError && <p role="alert" className="demo-error">{resetError}</p>}
    <ReliefApp
      key={`${view}-${revision}`}
      view={view}
      demo
      transport={store.transport}
      onResetDemo={() => {
        try {
          store.reset();
          setResetError("");
          setRevision((value) => value + 1);
        } catch {
          setResetError("Your browser has blocked site storage. Enable storage to reset the demo.");
        }
      }}
    />
  </>;
}

createRoot(document.getElementById("root")!).render(<PublicDemo />);
