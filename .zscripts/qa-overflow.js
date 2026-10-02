(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  const wide = [];
  const walk = (el) => {
    for (const child of el.children) {
      if (child.scrollWidth > dlg.clientWidth + 1) {
        wide.push({
          tag: child.tagName,
          cls: (child.className || '').toString().slice(0, 80),
          sw: child.scrollWidth,
          cw: child.clientWidth,
        });
      }
      walk(child);
    }
  };
  walk(dlg);
  return JSON.stringify(wide.slice(0, 12));
})()
