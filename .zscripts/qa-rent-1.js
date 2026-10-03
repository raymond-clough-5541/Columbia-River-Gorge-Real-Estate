(() => {
  const rentEl = Array.from(document.querySelectorAll('span')).find(s => /^\$[\d,]+\/mo$/.test(s.textContent));
  const before = rentEl?.textContent;
  const btn = document.querySelector('[role=radiogroup][aria-label="Rent posture"] button[title*="0.85"]');
  if (btn) btn.click();
  return JSON.stringify({ rentBefore: before, clickedConservative: !!btn });
})()
