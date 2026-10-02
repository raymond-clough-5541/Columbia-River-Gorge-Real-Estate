// ============================================================
// Portable Review Gallery — Progress Report view (R86)
// Identical to the Free Trader instance copy; the tour content
// below is Free Trader's R86 report and is meant to be REWRITTEN
// for your project (the structure is the reusable part).
//
// WHY THIS EXISTS: the user asked (verbatim): "what is the best
// way to explain the progress and provide the screen shot to a
// non technical user review and understand the project how it
// work currently what is being worked currently and a report
// include the front end progress and back end progress".
//
// A progress report for a non-technical reviewer: plain
// language, every claim paired with a screenshot, honest
// progress bars derived from the feature inventory, and the
// recommended next track (DR-23: recommendations ship WITH the
// questions, never without).
//
// This is part of the review-gallery engine (DR-25): served at
// /report on port 3031, outside the app tree (DR-21), and the
// screenshots it embeds come from the local corpus (DR-13,
// never pushed). Engine parity: portable-workflows/review-gallery/
// carries an identical copy (DR-14).
// ============================================================

// The corpus sections as scanned by index.ts (minimal structural
// shape; index.ts passes its real Section[] which is compatible).
export type ReportCtx = {
  /** Build a gateway-safe image URL for a corpus-relative shot path. */
  img: (rel: string) => string;
  /** Is a given corpus-relative shot path present on disk? */
  has: (rel: string) => boolean;
  /** URL of the gallery view (for nav + review pointers). */
  galleryHref: string;
  /** URL of this report view (for nav). */
  reportHref: string;
  /** Content date (the round this report was written for). */
  contentDate: string;
  /** All scanned sections (newest first) so the report can count shots. */
  sections: Array<{ shots: Array<{ rel: string }> }>;
};

type TourStep = {
  n: number;
  phase: string;
  title: string;
  body: string;
  shot: string;
  alt: string;
};

type AreaCard = {
  name: string;
  status: "done" | "wip" | "next";
  pct: number;
  body: string;
};

type TimelineItem = { tag: string; title: string; body: string };

type NextStep = { title: string; why: string };

const STATUS_LABEL: Record<AreaCard["status"], string> = {
  done: "COMPLETE",
  wip: "IN PROGRESS",
  next: "PLANNED",
};

// ------------------------------------------------------------
// Content. Plain language, no jargon, no em dashes (AR-2 applies
// to every user-visible string this service renders).
// ------------------------------------------------------------

const WHAT_IS_THIS = [
  "Free Trader is a neighborhood marketplace: a website where people list things to sell, give away, or ask for (that last kind is called ISO, short for In Search Of), message each other privately, and organize in local groups.",
  "The project has one unusual rule that shapes every screen: it must look and feel handcrafted by a person, not like a generic AI-made template. That rule is not just an opinion; it is enforced by an automated style checker and periodic visual audits on every change.",
];

const SIX_REQUIREMENTS: Array<[string, string]> = [
  ["Anti-AI style", "every screen must feel human-made: warm, editorial, distinctive"],
  ["Functional", "everything you can see and click actually works; no fake buttons"],
  ["Scalable", "standard patterns throughout, so growth does not force a rebuild"],
  ["Secure", "inputs are checked, destructive actions are gated, secrets stay out"],
  ["Aesthetic", "asymmetric layouts, a serif display font, paper texture, category colors"],
  ["Accessible", "readable by everyone, including people using screen readers or magnification"],
];

const TOUR: TourStep[] = [
  {
    n: 1,
    phase: "Getting in",
    title: "The welcome page",
    body: "What a first-time visitor sees. It shows honest activity counts from the data (no invented place names, no fake testimonials).",
    shot: "r86-report/01-welcome.png",
    alt: "Welcome page with the headline Trade with your neighbors, sign-in and sign-up forms, and a Google option",
  },
  {
    n: 2,
    phase: "Getting in",
    title: "Signing in",
    body: "Email and password, plus a Google option. New accounts go into a review queue before they can trade; throwaway email addresses are blocked at the door.",
    shot: "r86-report/02-sign-in.png",
    alt: "Sign-in form with email and password fields",
  },
  {
    n: 3,
    phase: "The marketplace",
    title: "The main board",
    body: "After signing in: a personal greeting, shortcuts to your own corners, a live activity ticker, and listings grouped by category.",
    shot: "r86-report/03-feed.png",
    alt: "Main feed with greeting, shortcuts, activity ticker, and category listing cards",
  },
  {
    n: 4,
    phase: "The marketplace",
    title: "A listing's page",
    body: "Photos, price, and condition up top; the seller's card with their trust score; and meet-up safety tips at the bottom. Owners get edit, mark-sold, and archive tools here.",
    shot: "r86-report/04-listing-detail.png",
    alt: "Listing detail page with photo, price, seller card, and safety tips",
  },
  {
    n: 5,
    phase: "The marketplace",
    title: "ISO: asking for things",
    body: "Neighbors post what they are looking for. A request can carry a reference photo (a picture of the thing they want); without one it shows a clearly-marked WANTED tile.",
    shot: "r86-report/05-iso.png",
    alt: "ISO page showing wanted requests, one with a reference photo and others as WANTED tiles",
  },
  {
    n: 6,
    phase: "The marketplace",
    title: "Posting something",
    body: "A step-by-step wizard with three kinds of posting: For Sale, Free, and ISO. Photos can be dragged in; for ISO requests a photo is optional.",
    shot: "r86-report/06-create-listing.png",
    alt: "Create-listing wizard, first step with photo upload and posting type choices",
  },
  {
    n: 7,
    phase: "Neighbors talking",
    title: "Private messages",
    body: "Real-time chat between neighbors: messages arrive instantly, can carry photos, can be pinned, and show read receipts.",
    shot: "r86-report/07-messages.png",
    alt: "Messages page with a conversation list on the left and an open thread on the right",
  },
  {
    n: 8,
    phase: "Neighbors talking",
    title: "Groups",
    body: "Local communities a member can join, browse, and post in. Groups have member lists, activity feeds, and their own listings.",
    shot: "r86-report/08-groups.png",
    alt: "Groups page showing group cards with covers and member counts",
  },
  {
    n: 9,
    phase: "Neighbors talking",
    title: "Notifications",
    body: "One inbox for everything: new messages, ratings, group invites, listing approvals, and safety updates. Unread counts carry over to the bell icon.",
    shot: "r86-report/09-notifications.png",
    alt: "Notifications page with a list of notifications and category badges",
  },
  {
    n: 10,
    phase: "Your corner",
    title: "The saved board",
    body: "Listings a member bookmarked for later, kept together on one board.",
    shot: "r86-report/10-saved.png",
    alt: "Saved listings page showing bookmarked listing cards",
  },
  {
    n: 11,
    phase: "Your corner",
    title: "Your profile",
    body: "A member's public face: trust score with its breakdown, feedback from other members, activity history, and an about section.",
    shot: "r86-report/13-profile.png",
    alt: "Profile page with trust score, feedback chart, and tabs",
  },
  {
    n: 12,
    phase: "Making it yours",
    title: "Themes and fonts",
    body: "Settings, Appearance: five theme choices (Light, Gray, Dark, Matte Black, or follow your device) and three display fonts. Your pick is remembered.",
    shot: "r86-report/11-settings-appearance.png",
    alt: "Settings Appearance page with theme swatches and the display font selector",
  },
  {
    n: 13,
    phase: "Making it yours",
    title: "The command palette",
    body: "Press Ctrl+K (or the search button) and jump anywhere in the app by keyboard. The key labels were corrected to the convention real products use.",
    shot: "r86-report/12-command-palette.png",
    alt: "Command palette overlay with a search box and navigation suggestions",
  },
  {
    n: 14,
    phase: "Making it yours",
    title: "Dark and Matte Black",
    body: "The whole app carries over into dark themes, including the warm paper-texture surfaces. This is the same main board in Dark.",
    shot: "r86-report/14-dark-feed.png",
    alt: "The main feed rendered in the dark theme",
  },
  {
    n: 15,
    phase: "Making it yours",
    title: "On a phone",
    body: "The layout adapts to small screens: cards stack, the primary navigation moves to the bottom, and the posting button stays reachable.",
    shot: "r86-report/15-mobile-feed.png",
    alt: "The app on a phone-width screen with stacked cards and bottom navigation",
  },
];

const FRONTEND: AreaCard[] = [
  {
    name: "Marketplace and search",
    status: "done",
    pct: 100,
    body: "Feed with filters and sorting, compare tray, saved board, recently viewed. All working.",
  },
  {
    name: "Posting: listings and ISO",
    status: "done",
    pct: 100,
    body: "Step-by-step wizard with real photo upload, three posting types, optional reference photos for ISO.",
  },
  {
    name: "Messaging",
    status: "done",
    pct: 95,
    body: "Real-time chat with photos, pins, typing indicators, read receipts. Message search is on the polish list.",
  },
  {
    name: "Groups",
    status: "done",
    pct: 90,
    body: "Join, leave, create, and browse groups with member lists and activity feeds. Saving group settings lands with the database port.",
  },
  {
    name: "Notifications",
    status: "done",
    pct: 95,
    body: "All nine notification types with filters and deep links. Push alerts to phones are on the polish list.",
  },
  {
    name: "Profiles and trust",
    status: "done",
    pct: 100,
    body: "Public profiles, trust-score breakdown, feedback distribution, member ratings.",
  },
  {
    name: "Settings and personalization",
    status: "done",
    pct: 95,
    body: "Five themes, three display fonts, two-factor setup, privacy controls, blocked-users list. Changing your email address lands with the database port.",
  },
  {
    name: "Staff dashboards",
    status: "wip",
    pct: 40,
    body: "Admin, moderator, and advertiser layouts exist with review queues; their actions still run on sample data (see Backend).",
  },
  {
    name: "Accessibility and the anti-AI rule",
    status: "done",
    pct: 100,
    body: "Keyboard navigation, screen-reader labels, contrast checks, and the automated anti-AI style gate on every change.",
  },
];

const BACKEND: AreaCard[] = [
  {
    name: "Sign-in and accounts",
    status: "wip",
    pct: 70,
    body: "Real login sessions, sign-up protection (throwaway-email blocking, account review queue), two-factor codes. Runs on sample data until the database port.",
  },
  {
    name: "Real-time messaging service",
    status: "done",
    pct: 90,
    body: "A separate always-on service delivers messages instantly between browsers. Works today; only the long-term storage of history lands with the database port.",
  },
  {
    name: "Application interfaces (API)",
    status: "wip",
    pct: 75,
    body: "17 endpoints serving listings, groups, conversations, notifications, reports, and admin data. Every input is validated, every sensitive action is gated.",
  },
  {
    name: "Safety and admin data",
    status: "wip",
    pct: 60,
    body: "Audit trail, IP records, and ban controls exist as endpoints with local database tables, currently fed by sample data.",
  },
  {
    name: "Production database",
    status: "next",
    pct: 10,
    body: "The security policies (row-level rules deciding who may read and write what) are written. Connecting the hosted database is the next big milestone.",
  },
  {
    name: "Quality automation",
    status: "done",
    pct: 100,
    body: "212 automated tests, 4 quality gates, and 10 commit checks run on every change. Nothing ships if any of them fails.",
  },
];

const SAMPLE_DATA_NOTE =
  "Today the app runs on realistic sample data that lives on this machine. Every button and flow is real; the data is just not permanent or shared between users yet. Moving to a hosted production database is the single biggest remaining step, and the code was deliberately structured so that switch does not require rebuilding anything you can see above.";

const TIMELINE: TimelineItem[] = [
  {
    tag: "R82",
    title: "The great polish campaign",
    body: "Every page was audited with 53 screenshots and an AI vision reviewer; 14 real defects were found and fixed. This is when the app stopped looking machine-made.",
  },
  {
    tag: "R83",
    title: "Review hygiene",
    body: "Review material was moved out of the app itself. This gallery (a separate local service) became the official review surface, so nothing review-related ever ships inside the product.",
  },
  {
    tag: "R84",
    title: "Your seven verdicts, part 1",
    body: "You reviewed and decided; we implemented: an honest welcome page (no invented places), reference photos for ISO requests, more readable notification badges, corrected keyboard labels. Your six requirements were written down as the measuring stick, and a new rule: every question to you now ships with a recommendation.",
  },
  {
    tag: "R85",
    title: "Your verdicts, part 2",
    body: "All three display fonts (Fraunces, Lora, Zilla Slab) became a personal choice in Settings, and this screenshot gallery was built so you can review with your eyes instead of text documents.",
  },
  {
    tag: "R86",
    title: "This progress report",
    body: "The page you are reading: a plain-language walkthrough of what the project is, how it works, and where it stands.",
  },
];

const OPEN_FOR_YOUR_EYES: Array<[string, string]> = [
  [
    "The overall look",
    "Browse the gallery (link at the top) and tell me anything that feels off, confusing, or ugly. Or simply confirm it looks right; that counts as the formal sign-off.",
  ],
  [
    "The badge-size trial",
    "Notification category badges were made slightly larger and stronger (shot 9 in the tour above). Keep the current size, or say the word and it goes back.",
  ],
];

const NEXT_TRACK: NextStep[] = [
  {
    title: "First: connect the production database",
    why: "Recommended first. It unlocks real accounts and permanent data, turns every runs on sample data line in this report into real, and it is the biggest risk item, so it is safest to do while the app is stable. What you would notice: accounts and listings survive restarts and are shared between users.",
  },
  {
    title: "Second: make the staff tools real",
    why: "The member experience is finished; safety tooling is what a real launch needs next. Admin and moderator actions would stop being demonstrations and start writing real records.",
  },
  {
    title: "Third: the polish list",
    why: "Message search, listing drafts, push notifications. Small, independent improvements; each can land anytime without blocking the others.",
  },
];

const HOW_TO_REVIEW =
  "You do not need technical knowledge to review this project. Look at the screenshots here and in the gallery; click any image to enlarge it. If anything feels off, confusing, or ugly, that is a finding: tell me in plain words. Every claim in this report sits next to a screenshot; if a claim and its screenshot ever disagree, trust the screenshot.";

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------

function chip(status: AreaCard["status"]): string {
  return `<span class="chip chip-${status}">${STATUS_LABEL[status]}</span>`;
}

function bar(pct: number): string {
  return `<div class="bar" role="img" aria-label="${pct} percent complete"><div class="bar-fill" style="width:${pct}%"></div></div>`;
}

function areaCard(a: AreaCard): string {
  return `<article class="area">
    <div class="area-head"><h4>${a.name}</h4>${chip(a.status)}</div>
    ${bar(a.pct)}
    <p>${a.body}</p>
  </article>`;
}

function tourStep(s: TourStep, ctx: ReportCtx): string {
  const src = ctx.img(s.shot);
  const media = ctx.has(s.shot)
    ? `<img src="${src}" alt="${s.alt}" loading="lazy" />`
    : `<div class="missing">Capture not found on this machine: <code>${s.shot}</code></div>`;
  return `<article class="step">
    <div class="step-head">
      <span class="step-n" aria-hidden="true">${s.n}</span>
      <div><span class="step-phase">${s.phase}</span><h3>${s.title}</h3></div>
    </div>
    <p>${s.body}</p>
    <figure class="shot" tabindex="0" data-src="${src}">
      ${media}
    </figure>
  </article>`;
}

function timelineItem(t: TimelineItem): string {
  return `<li>
    <span class="tl-tag">${t.tag}</span>
    <div class="tl-body"><h4>${t.title}</h4><p>${t.body}</p></div>
  </li>`;
}

export function buildReportHtml(ctx: ReportCtx): string {
  const totalShots = ctx.sections.reduce((n, s) => n + s.shots.length, 0);
  const tourHtml = TOUR.map((s) => tourStep(s, ctx)).join("\n");
  const frontendHtml = FRONTEND.map(areaCard).join("\n");
  const backendHtml = BACKEND.map(areaCard).join("\n");
  const timelineHtml = TIMELINE.map(timelineItem).join("\n");
  const reqsHtml = SIX_REQUIREMENTS.map(
    ([name, body]) => `<li><strong>${name}:</strong> ${body}</li>`,
  ).join("\n");
  const openHtml = OPEN_FOR_YOUR_EYES.map(
    ([title, body]) => `<li><strong>${title}.</strong> ${body}</li>`,
  ).join("\n");
  const nextHtml = NEXT_TRACK.map(
    (n, i) =>
      `<li><h4>${i + 1}. ${n.title}</h4><p>${n.why}</p></li>`,
  ).join("\n");

  const frontAvg = Math.round(
    FRONTEND.reduce((n, a) => n + a.pct, 0) / FRONTEND.length,
  );
  const backAvg = Math.round(
    BACKEND.reduce((n, a) => n + a.pct, 0) / BACKEND.length,
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Free Trader — Progress Report</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    background: #141210; color: #e8e2d9;
    font: 15px/1.6 ui-sans-serif, system-ui, sans-serif;
  }
  header.rpt-header, main, .viewnav-wrap { max-width: 1080px; margin: 0 auto; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 40px 0 6px; color: #f0e9de; }
  h3 { font-size: 15px; margin: 0; }
  h4 { font-size: 14px; margin: 0 0 4px; color: #e8e2d9; }
  p { margin: 6px 0; color: #c9bfae; }
  .lede { font-size: 16px; color: #d8cfc2; }
  .banner {
    background: #241f1a; border: 1px solid #3a332a; border-radius: 8px;
    padding: 10px 14px; font-size: 13px; color: #b5ab9c; margin: 12px 0 0;
  }
  .banner strong { color: #e8e2d9; }
  .viewnav {
    display: flex; gap: 8px; margin: 18px 0 8px;
  }
  .viewnav a {
    color: #d8cfc2; text-decoration: none; font-size: 13px;
    padding: 7px 14px; border: 1px solid #3a332a; border-radius: 999px;
    background: #1c1915;
  }
  .viewnav a:hover { border-color: #5a5142; }
  .viewnav a[aria-current="page"] {
    background: #2e2721; color: #f0e9de; border-color: #6b5f4b;
  }
  .toc { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 0; }
  .toc a {
    color: #b5ab9c; font-size: 12px; text-decoration: none;
    border: 1px solid #3a332a; border-radius: 6px; padding: 4px 10px;
  }
  .toc a:hover { color: #e8e2d9; border-color: #5a5142; }
  .reqs { margin: 10px 0 0; padding-left: 20px; }
  .reqs li { margin: 4px 0; color: #c9bfae; }
  .reqs strong { color: #e8e2d9; }
  .steps {
    display: grid; gap: 16px; margin-top: 14px;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  .step {
    background: #1c1915; border: 1px solid #3a332a; border-radius: 10px;
    padding: 14px;
  }
  .step-head { display: flex; gap: 10px; align-items: flex-start; }
  .step-n {
    flex: none; width: 28px; height: 28px; border-radius: 50%;
    background: #2e2721; border: 1px solid #6b5f4b; color: #e8e2d9;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600;
  }
  .step-phase {
    display: block; font-size: 11px; letter-spacing: .08em;
    text-transform: uppercase; color: #8d8272;
  }
  .step .shot { margin: 10px 0 0; }
  .shot img {
    width: 100%; display: block; border-radius: 6px; cursor: zoom-in;
    border: 1px solid #3a332a; background: #000;
  }
  .missing {
    border: 1px dashed #5a5142; border-radius: 6px; padding: 18px 12px;
    color: #8d8272; font-size: 12px; text-align: center;
  }
  .areas {
    display: grid; gap: 12px; margin-top: 14px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  .area {
    background: #1c1915; border: 1px solid #3a332a; border-radius: 10px;
    padding: 12px 14px;
  }
  .area-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .area p { font-size: 13px; margin: 8px 0 0; }
  .chip {
    flex: none; font-size: 10px; letter-spacing: .06em; font-weight: 700;
    border-radius: 999px; padding: 3px 9px;
  }
  .chip-done { background: #26301f; color: #a8c28e; border: 1px solid #3f5632; }
  .chip-wip { background: #332a1c; color: #d9a866; border: 1px solid #5f4c2a; }
  .chip-next { background: #26231f; color: #9c9284; border: 1px solid #3a332a; }
  .bar {
    height: 7px; background: #26231f; border: 1px solid #3a332a;
    border-radius: 999px; margin-top: 9px; overflow: hidden;
  }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #8a6d3f, #d9a866); }
  .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-top: 14px; }
  .summary-card {
    background: #241f1a; border: 1px solid #3a332a; border-radius: 10px;
    padding: 14px 16px;
  }
  .summary-card .big { font-size: 28px; font-weight: 700; color: #f0e9de; }
  .summary-card .big small { font-size: 13px; font-weight: 400; color: #8d8272; }
  .note {
    background: #241f1a; border: 1px solid #3a332a; border-radius: 10px;
    padding: 12px 16px; font-size: 14px; color: #cabfae; margin-top: 14px;
  }
  ol.timeline { list-style: none; margin: 14px 0 0; padding: 0; }
  .timeline li {
    display: flex; gap: 14px; padding: 12px 0;
    border-top: 1px solid #2b261f;
  }
  .timeline li:first-child { border-top: none; }
  .tl-tag {
    flex: none; font-size: 11px; font-weight: 700; letter-spacing: .06em;
    color: #d9a866; border: 1px solid #5f4c2a; background: #332a1c;
    border-radius: 6px; padding: 3px 8px; height: fit-content;
  }
  .tl-body p { font-size: 13px; margin: 2px 0 0; }
  ol.plainlist { margin: 10px 0 0; padding-left: 20px; }
  ol.plainlist li { margin: 10px 0; color: #c9bfae; }
  ol.plainlist h4 { color: #f0e9de; }
  ul.openlist { margin: 10px 0 0; padding-left: 20px; }
  ul.openlist li { margin: 10px 0; color: #c9bfae; }
  footer.rpt-footer {
    max-width: 1080px; margin: 40px auto 0; padding-top: 16px;
    border-top: 1px solid #2b261f; font-size: 12px; color: #8d8272;
  }
  #lightbox {
    position: fixed; inset: 0; background: rgba(10, 8, 6, .94);
    display: none; align-items: center; justify-content: center;
    flex-direction: column; gap: 12px; z-index: 10; padding: 28px;
  }
  #lightbox.open { display: flex; }
  #lightbox img { max-width: 100%; max-height: 88vh; border-radius: 6px; }
  #closeHint { color: #8d8272; font-size: 12px; }
  @media (max-width: 640px) {
    body { padding: 14px; }
    .steps { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<header class="rpt-header">
  <h1>Free Trader — Progress Report</h1>
  <p class="lede">A plain-language walkthrough for a non-technical reader: what this project is, how it works today, what is finished, what is in progress, and what comes next.</p>
  <nav class="viewnav" aria-label="Review surface views">
    <a href="${ctx.galleryHref}">Screenshot gallery</a>
    <a href="${ctx.reportHref}" aria-current="page">Progress report</a>
  </nav>
  <div class="banner">
    <strong>How to read this:</strong> every claim below sits next to a
    screenshot you can check yourself. Progress bars compare today's app
    against the original written specification (the feature inventory in
    <code>docs/FEATURE-GAP-ANALYSIS.md</code>, refreshed each round). Content
    current as of <strong>${ctx.contentDate}</strong> (round R86). The gallery
    beside this report holds <strong>${totalShots} screenshots</strong> in
    total, including the full archive.
  </div>
  <nav class="toc" aria-label="Report sections">
    <a href="#what">What is this</a>
    <a href="#tour">How it works</a>
    <a href="#frontend">Frontend progress</a>
    <a href="#backend">Backend progress</a>
    <a href="#story">Recently completed</a>
    <a href="#next">What is next</a>
    <a href="#review">How to review</a>
  </nav>
</header>

<main>
  <section id="what">
    <h2>1. What is Free Trader?</h2>
    ${WHAT_IS_THIS.map((t) => `<p class="lede">${t}</p>`).join("\n")}
    <p>The project is judged against six standing requirements, agreed with the owner and written down:</p>
    <ul class="reqs">
      ${reqsHtml}
    </ul>
  </section>

  <section id="tour">
    <h2>2. How it works today: a guided tour</h2>
    <p>Fifteen steps, in the order a real member would meet them. Click any screenshot to enlarge.</p>
    <div class="steps">
      ${tourHtml}
    </div>
  </section>

  <section id="frontend">
    <h2>3. Frontend progress: everything you can see and click</h2>
    <div class="summary">
      <div class="summary-card">
        <div class="big">${frontAvg}% <small>of the full spec</small></div>
        <p>Member-facing experience. Everything core works today; what remains are enhancements and the staff tools.</p>
      </div>
      <div class="summary-card">
        <div class="big">15 <small>surfaces toured above</small></div>
        <p>Welcome, sign-in, feed, listing pages, ISO, posting wizard, messages, groups, notifications, saved board, profile, settings, palette, dark themes, and mobile.</p>
      </div>
    </div>
    <div class="areas">
      ${frontendHtml}
    </div>
  </section>

  <section id="backend">
    <h2>4. Backend progress: everything that makes it work</h2>
    <div class="summary">
      <div class="summary-card">
        <div class="big">${backAvg}% <small>of the full plan</small></div>
        <p>Everything runs today on this machine; the permanent, shared production database is the big remaining piece.</p>
      </div>
    </div>
    <div class="areas">
      ${backendHtml}
    </div>
    <div class="note">
      <strong>What sample data means, in plain words:</strong> ${SAMPLE_DATA_NOTE}
    </div>
  </section>

  <section id="story">
    <h2>5. Recently completed: the story so far</h2>
    <p>The last five rounds of work, newest last. You reviewed, we implemented.</p>
    <ol class="timeline">
      ${timelineHtml}
    </ol>
  </section>

  <section id="next">
    <h2>6. What is being worked on now, and what comes next</h2>
    <h3>Open for your eyes</h3>
    <ul class="openlist">
      ${openHtml}
    </ul>
    <h3 style="margin-top:22px">The recommended track</h3>
    <p>In order, with the reasoning. You decide; this is the recommendation, not a done deal.</p>
    <ol class="plainlist">
      ${nextHtml}
    </ol>
  </section>

  <section id="review">
    <h2>7. How to review this project</h2>
    <p class="lede">${HOW_TO_REVIEW}</p>
  </section>
</main>

<footer class="rpt-footer">
  <p>Generated by the local review service. Screenshots never enter the app and never leave this machine (rules DR-13 and DR-25). This report renders live; the corpus beside it re-scans automatically.</p>
</footer>

<div id="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot enlarged">
  <img alt="" />
  <div id="closeHint">Click anywhere or press Esc to close</div>
</div>
<script>
(function () {
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  function open(fig) {
    var img = fig.querySelector("img");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lb.classList.add("open");
  }
  function close() { lb.classList.remove("open"); }
  document.querySelectorAll(".shot").forEach(function (fig) {
    fig.addEventListener("click", function () { open(fig); });
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(fig); }
    });
  });
  lb.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
</script>
</body>
</html>`;
}
