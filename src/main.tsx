import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import DesignBacklog from "./pages/DesignBacklog";
import "./index.css";

// ── Minimal hash router — no external dependency ────────────────────────────

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function getHash() {
  return window.location.hash;
}

function Router() {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  if (hash === "#/backlog") return <DesignBacklog />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
