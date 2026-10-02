// Portable Review Gallery — security self-test (run: bun self-test.mjs)
// Proves the guard model in YOUR environment before you ship the gallery:
//   1. gallery page renders (200, text/html)
//   2. PNG under the corpus serves (200, image/png)
//   3. path traversal OUT of the corpus is blocked (403)
//   4. non-PNG files are never served (404)
//   5. progress-report view renders (200, text/html, title present) and
//      degrades gracefully when its tour shots are absent (placeholder,
//      not a crash — R86)
//   6. round-mode corpus groups by the rNNN- prefix, newest round first (R212)
//   7. round section titles derive from the design-pass doc filenames
//   8. corpus-prefixed image serves (/?img=c1/<rel> — 200, image/png)
//   9. round-mode captions humanize the filename slug
//  10. corpus-prefixed path traversal is blocked (403)
//  11. scan mode machinery is served (F key + button, requestFullscreen
//      with the scan-class fallback contract — R214)
//  12. the fullscreenchange listener is served (browser-Esc keeps the
//      lightbox open, scan styling drops — R214)
//  13. the scan CSS rules are served (edge-to-edge FILL: 100vw/100vh
//      + object-fit cover, compact bottom chrome, idle fade — and the
//      retired contain rule gone — R214/R216)
//  14. Home/End jump handling is served (R214)
//  15. the ±1 neighbor preload is served (R214)
//  16. the gallery-level arrows with the input-focus guard are served (R214)
//  17. the updated hint copy is served (walk, Home/End, F fit whole
//      shot, Z native 1:1, backdrop close — R216)
//  18. click-to-open enters scan mode by default: open() calls
//      enterScan() after adding the open class (R215 — the shot
//      opens DIRECTLY full screen, no extra keypress)
//  19. the scan-button label flips with the mode ("Windowed (F)"
//      while scanning, "Full screen (F)" when windowed — R215)
//  20. the banner copy says clicking opens the shot filling the
//      screen edge to edge, F fits the whole shot smaller, Z is
//      native 1:1 pixels scrollable (R216)
//  21. the zoom img rule overrides the fill sizing: width/height
//      auto + object-fit initial, declared AFTER the scan img rule
//      (equal specificity — source order wins — R216)
// Exit 0 = the model holds. If it ever fails, do not ship.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_PORT = 3999;
const ROOT = join(import.meta.dir, ".self-test-corpus");
const ROUND_ROOT = join(import.meta.dir, ".self-test-round-corpus");
const TITLE_DIR = join(import.meta.dir, ".self-test-titles");
const BASE = `http://localhost:${TEST_PORT}`;

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// Corpus 0 (folder mode): one real PNG (1x1 transparent) + a json decoy.
mkdirSync(ROOT, { recursive: true });
writeFileSync(join(ROOT, "shot.png"), PNG_1PX);
writeFileSync(join(ROOT, "decoy.json"), "{}");

// Corpus 1 (round mode): flat rNNN-slug.png receipts + title docs.
mkdirSync(ROUND_ROOT, { recursive: true });
mkdirSync(TITLE_DIR, { recursive: true });
writeFileSync(join(ROUND_ROOT, "r9-thing-one.png"), PNG_1PX);
writeFileSync(join(ROUND_ROOT, "r9-thing-two.png"), PNG_1PX);
writeFileSync(join(ROUND_ROOT, "r12-other-thing.png"), PNG_1PX);
writeFileSync(join(TITLE_DIR, "r9-thing.md"), "# R9 — thing");
writeFileSync(join(TITLE_DIR, "r12-other-thing.md"), "# R12 — other thing");

// Boot the engine with both test corpora.
const proc = Bun.spawn(["bun", "index.ts"], {
  cwd: import.meta.dir,
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    CORPUS_ROOT: ROOT,
    EXTRA_CORPUS_ROOTS: `${ROUND_ROOT}:round`,
    SECTION_TITLE_DIRS: TITLE_DIR,
  },
  stdout: "pipe",
  stderr: "pipe",
});

// Wait for listen.
let up = false;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 150));
  try {
    await fetch(`${BASE}/`);
    up = true;
    break;
  } catch {
    /* not up yet */
  }
}

let failures = 0;
let passed = 0;
function assert(name, cond) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}`);
  if (!cond) failures++;
  else passed++;
}

try {
  if (!up) throw new Error("server never came up");
  const page = await fetch(`${BASE}/`);
  assert(
    "1. gallery page renders (200 text/html)",
    page.status === 200 && (page.headers.get("content-type") ?? "").includes("text/html"),
  );
  const img = await fetch(`${BASE}/?img=shot.png`);
  assert(
    "2. corpus PNG serves (200 image/png)",
    img.status === 200 && img.headers.get("content-type") === "image/png",
  );
  const trav = await fetch(`${BASE}/?img=${encodeURIComponent("../package.json")}`);
  assert("3. path traversal blocked (403)", trav.status === 403);
  const nonpng = await fetch(`${BASE}/?img=decoy.json`);
  assert("4. non-PNG rejected (404)", nonpng.status === 404);
  const report = await fetch(`${BASE}/report`);
  const reportText = await report.text();
  assert(
    "5. progress report renders (200, title, no crash on missing shots)",
    report.status === 200 &&
      (report.headers.get("content-type") ?? "").includes("text/html") &&
      reportText.includes("Progress Report") &&
      reportText.includes("Capture not found"),
  );
  const galleryText = await (await fetch(`${BASE}/`)).text();
  const r12At = galleryText.indexOf('id="sec-R12"');
  const r9At = galleryText.indexOf('id="sec-R9"');
  assert(
    "6. round corpus groups by rNNN prefix, newest round first",
    r12At !== -1 && r9At !== -1 && r12At < r9At,
  );
  assert(
    "7. round titles derive from design-pass doc filenames",
    galleryText.includes("R12 — Other Thing") && galleryText.includes("R9 — Thing"),
  );
  const roundImg = await fetch(`${BASE}/?img=c1/r9-thing-one.png`);
  assert(
    "8. corpus-prefixed PNG serves (200 image/png)",
    roundImg.status === 200 && roundImg.headers.get("content-type") === "image/png",
  );
  assert(
    "9. round captions humanize the filename slug",
    galleryText.includes(">Thing One</span>"),
  );
  const roundTrav = await fetch(
    `${BASE}/?img=${encodeURIComponent("c1/../../package.json")}`,
  );
  assert("10. corpus-prefixed traversal blocked (403)", roundTrav.status === 403);
  // R214: the scan-mode + keyboard-walk machinery must be in the served HTML.
  assert(
    "11. scan mode served (F key + button, requestFullscreen + class fallback)",
    galleryText.includes("toggleScan") &&
      galleryText.includes("lb.requestFullscreen") &&
      galleryText.includes("webkitRequestFullscreen") &&
      galleryText.includes("Full screen (F)"),
  );
  assert(
    "12. fullscreenchange listener served (browser-Esc keeps the lightbox open)",
    galleryText.includes('document.addEventListener("fullscreenchange"'),
  );
  assert(
    "13. scan CSS served (edge-to-edge fill: 100vw/100vh + object-fit cover; the contain rule is gone)",
    galleryText.includes("#lightbox.scan { padding: 0; }") &&
      galleryText.includes("width: 100vw; height: 100vh;") &&
      galleryText.includes("object-fit: cover;") &&
      galleryText.includes("#lightbox.scan.idle .lb-chrome { opacity: 0; }") &&
      !galleryText.includes("max-height: 100vh; max-width: 100vw;"),
  );
  assert(
    "14. Home/End jump handling served",
    galleryText.includes('e.key === "Home"') && galleryText.includes('e.key === "End"'),
  );
  assert(
    "15. neighbor preload served (the walk never stalls on network)",
    galleryText.includes("preloadNeighbors") && galleryText.includes("new Image()"),
  );
  assert(
    "16. gallery-level arrows + the input-focus guard served",
    galleryText.includes("isTypingTarget(document.activeElement)") &&
      galleryText.includes('tag === "input" || tag === "textarea"'),
  );
  assert(
    "17. updated hint copy served (walk, Home/End, F fit whole shot, Z native 1:1, backdrop close)",
    galleryText.includes("Home/End jump") &&
      galleryText.includes("F fit whole shot") &&
      galleryText.includes("Z native 1:1") &&
      galleryText.includes("Esc or click the backdrop to close"),
  );
  // R215: clicking a shot must open it DIRECTLY in scan mode — the
  // open() body calls enterScan() after adding the open class.
  const openAt = galleryText.indexOf("function open(fig)");
  const idleAt = galleryText.indexOf("function stopIdleTimer");
  const openBody = openAt !== -1 && idleAt !== -1 ? galleryText.slice(openAt, idleAt) : "";
  assert(
    "18. click-to-open enters scan mode by default (open() calls enterScan after the open class)",
    openBody.includes('lb.classList.add("open");') &&
      openBody.includes("enterScan();") &&
      openBody.indexOf('lb.classList.add("open");') < openBody.indexOf("enterScan();"),
  );
  assert(
    "19. scan-button label flips with the mode (Windowed (F) / Full screen (F))",
    galleryText.includes('lbScanBtn.textContent = "Windowed (F)";') &&
      galleryText.includes('lbScanBtn.textContent = "Full screen (F)";'),
  );
  // The banner wraps across source lines — normalize whitespace before
  // matching so the tokens are layout-independent.
  const flat = galleryText.replace(/\s+/g, " ");
  assert(
    "20. banner copy served (click fills the screen edge to edge, F fits the whole shot, Z native 1:1)",
    flat.includes("click a shot to open it filling the screen edge to edge") &&
      flat.includes("F fits the whole shot smaller") &&
      flat.includes("Z for native 1:1 pixels (scrollable)"),
  );
  // R216: Z must override the explicit fill sizing — the zoom img rule
  // sets width/height auto (+ object-fit initial) and is declared AFTER
  // the scan img rule (equal specificity, source order wins).
  const scanRuleAt = galleryText.indexOf("#lightbox.scan img {");
  const zoomRuleAt = galleryText.indexOf("#lightbox.zoom img {");
  const ruleEnd = (at) => galleryText.indexOf("}", at);
  assert(
    "21. zoom rule overrides the fill (width/height auto + object-fit initial, declared after scan)",
    scanRuleAt !== -1 &&
      zoomRuleAt !== -1 &&
      scanRuleAt < zoomRuleAt &&
      galleryText.slice(scanRuleAt, ruleEnd(scanRuleAt)).includes("width: 100vw") &&
      galleryText.slice(scanRuleAt, ruleEnd(scanRuleAt)).includes("height: 100vh") &&
      galleryText.slice(scanRuleAt, ruleEnd(scanRuleAt)).includes("object-fit: cover") &&
      galleryText.slice(zoomRuleAt, ruleEnd(zoomRuleAt)).includes("width: auto") &&
      galleryText.slice(zoomRuleAt, ruleEnd(zoomRuleAt)).includes("height: auto") &&
      galleryText.slice(zoomRuleAt, ruleEnd(zoomRuleAt)).includes("object-fit: initial"),
  );
} catch (e) {
  failures++;
  console.log(`  ✗ self-test aborted: ${e}`);
} finally {
  proc.kill();
  rmSync(ROOT, { recursive: true, force: true });
  rmSync(ROUND_ROOT, { recursive: true, force: true });
  rmSync(TITLE_DIR, { recursive: true, force: true });
}

console.log(
  failures === 0
    ? `\nSELF-TEST PASS (${passed}/${passed}) — the guard model holds`
    : `\nSELF-TEST FAIL (${failures} of ${passed + failures}) — do NOT ship`,
);
process.exit(failures === 0 ? 0 : 1);
