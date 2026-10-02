window.__bootErrs = [];
(function () {
  var origErr = console.error;
  var origWarn = console.warn;
  console.error = function () {
    var args = Array.prototype.slice.call(arguments);
    try {
      window.__bootErrs.push('ERR: ' + args.map(function (x) {
        return typeof x === 'string' ? x : JSON.stringify(x);
      }).join(' ').slice(0, 300));
    } catch (e) { /* noop */ }
    return origErr.apply(console, args);
  };
  console.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    try {
      window.__bootErrs.push('WARN: ' + args.map(function (x) {
        return typeof x === 'string' ? x : JSON.stringify(x);
      }).join(' ').slice(0, 300));
    } catch (e) { /* noop */ }
    return origWarn.apply(console, args);
  };
  window.addEventListener('error', function (e) {
    window.__bootErrs.push('WINDOW-ERR: ' + (e.message || '').slice(0, 300));
  });
})();
