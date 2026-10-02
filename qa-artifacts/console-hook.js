// Console capture hook - armed before page scripts run
window.__consoleErrors = [];
window.__consoleWarnings = [];
window.addEventListener('error', (e) => { window.__consoleErrors.push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { window.__consoleErrors.push('unhandledrejection: ' + String(e.reason)); });
