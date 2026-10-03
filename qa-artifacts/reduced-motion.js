window.__consoleErrors = [];
window.addEventListener('error', (e) => { window.__consoleErrors.push(String(e.message)); });
// Emulate prefers-reduced-motion: reduce before app scripts run
const orig = window.matchMedia.bind(window);
window.matchMedia = (q) => {
  if (String(q).includes('prefers-reduced-motion')) {
    return { matches: true, media: String(q), onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
  }
  return orig(q);
};
