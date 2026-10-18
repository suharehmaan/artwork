/**
 * Development-only hotspot overlay.
 *
 * Enable it while `next dev` is running by opening
 * `http://localhost:3000/?debug=hotspots`
 * or by setting localStorage `exhibition-hotspot-debug` to `1`.
 * Production builds ignore both switches.
 */
export function isHotspotDebugEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "hotspots") {
    return true;
  }
  try {
    return window.localStorage.getItem("exhibition-hotspot-debug") === "1";
  } catch {
    return false;
  }
}
