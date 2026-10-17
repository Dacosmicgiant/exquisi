/**
 * Fire-and-forget analytics for client code (the language picker). Anonymous: a random id kept in
 * sessionStorage (gone when the tab closes), no cookies, no personal data. Uses sendBeacon so it
 * can never block navigation or rendering, and swallows every failure.
 */
export function sessionId(): string {
  try {
    let s = sessionStorage.getItem("ms-sid");
    if (!s) {
      s = (crypto.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`).replace(/-/g, "");
      sessionStorage.setItem("ms-sid", s);
    }
    return s;
  } catch {
    return `anon${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function track(event: { slug: string; type: "menu_view" | "language_select" | "story_open"; language: string; dish_id?: string }) {
  try {
    const body = JSON.stringify({ ...event, session_id: sessionId() });
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {}
}
