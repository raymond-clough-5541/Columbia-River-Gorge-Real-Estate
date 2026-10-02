(() => {
  const errs = [];
  const origErr = console.error;
  console.error = (...a) => { errs.push(a.join(' ').slice(0, 120)); origErr(...a); };
  window.__finalErrs = errs;
  return 'armed';
})()
