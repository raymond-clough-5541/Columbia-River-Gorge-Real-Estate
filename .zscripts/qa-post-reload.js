(() => {
  // persist across reload via sessionStorage won't survive; instead check after reload using a fresh hook
  const errs = [];
  const origErr = console.error;
  const origWarn = console.warn;
  console.error = (...a) => { errs.push('ERR: ' + a.join(' ').slice(0, 150)); origErr(...a); };
  console.warn = (...a) => { errs.push('WARN: ' + a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ').slice(0, 150)); origWarn(...a); };
  window.__postReload = errs;
  return 'armed post-reload capture';
})()
