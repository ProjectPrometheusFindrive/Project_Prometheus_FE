// Simple global toast event emitter for app-wide notifications

export function emitToast(message, type = "info", duration = 3000) {
  try {
    const detail = { message: String(message || ""), type, duration };
    const ev = new CustomEvent("app:toast", { detail });
    window.dispatchEvent(ev);
  } catch (e) {
    // Fallback if CustomEvent not available
    try {
      alert(String(message || ""));
    } catch {}
  }
}

export function onToast(handler) {
  function wrapped(e) {
    try {
      handler(e.detail);
    } catch {}
  }
  window.addEventListener("app:toast", wrapped);
  return () => window.removeEventListener("app:toast", wrapped);
}

