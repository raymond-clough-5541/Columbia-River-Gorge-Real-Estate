(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  const dlgRight = dlg.getBoundingClientRect().right;
  const offenders = [];
  document.querySelectorAll('[data-slot="dialog-content"] *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > dlgRight + 1) {
      offenders.push({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 90),
        right: Math.round(r.right),
        w: Math.round(r.width),
      });
    }
  });
  return JSON.stringify({
    dlgRight: Math.round(dlgRight),
    dlgSW: dlg.scrollWidth,
    dlgCW: dlg.clientWidth,
    offenders: offenders.slice(0, 10),
  });
})()
