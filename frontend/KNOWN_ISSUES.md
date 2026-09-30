# KNOWN ISSUES & ACCEPTED TRADEOFFS

Last verified: backend 45/45 · unit 34/34 (8 files) · E2E 2/2 (~15s) ·
lint zero errors · `tsc --noEmit` clean · build green. This file is the
durable record — do not re-derive these from chat logs.

## Accepted (deliberate, do not "fix" without discussion)

- **`retry_count` has no UI surface.** Backend returns it; nothing renders
  it. Not covered by E2E for the same reason. Revisit if a retries UI is
  ever added — add the assertion then.
- **No fake-WebGL mount test.** Deliberately skipped; the no-WebGL fallback
  it would stand in for is directly covered (`fallback.test.tsx`) instead.
- **E2E runs with `workers: 1`.** Both specs share one backend seed lot;
  parallel workers race it (observed, then pinned in `playwright.config.ts`
  with a comment).
- **Build chunk-size advisory.** Rolldown warns that 3D chunks exceed
  500 kB. Accepted: the scene chunk is lazy-loaded, so initial load is
  unaffected. Someday-item at best.
- **Demo countdowns tick from page load**, not a server-anchored clock.
  Fine for a demo; revisit for anything long-running or multi-user.
- **Lint warning families (accepted):** seeded-random purity in scene
  files, `Date.now` initializers, one intentional `exhaustive-deps` in the
  replay hook, fast-refresh export notes. Deliberate tradeoffs, not
  oversights — see source comments.
- **Offline SVG fallback map shows placeholder geography** (Bengaluru
  localities) rather than live-driven coordinates. Deferred: the primary
  3D/live map already uses real coordinates, so this affects only the
  no-WebGL fallback's visual polish, never data correctness.
- **`@types/node` is required — do not remove.** It looks unused from
  `src/`, but `tsconfig.node.json` declares `types: ["node"]` for the
  Vite-config project, and `tsc -b` fails without it. (Removal was
  attempted once and reverted for exactly this reason.)

## Demo-operation notes (not defects)

- **Lot drain is correct behavior.** Rescues/commits consume surplus; the
  board empties honestly. Watch the low-stock badge (≤2 lots) and use
  **Reset demo data** before presenting.
- **No catalog polling.** The registry loads on boot, after runs, and
  after resets, plus auto-refresh when a >60s-away tab regains focus.
  A manual "Synced Xs ago" refresh sits in the board toolbar. When in
  doubt, refresh the tab before presenting.
- **Backend summary strings render verbatim** in Match Engine results;
  backend `error` shapes map to titled UI states (including 409
  already-allocated with recovery actions).
## Brand color provenance (not designer-confirmed)
- Brand palette — teal `#17818f`, light teal `#3aa7b5`, coral `#e4645a`,
  deep coral `#c24a40` — was **visually matched from a photo of a printed
  card, not extracted or designer-confirmed**. No source design file
  (Figma/AI/brand guide) has been provided.
- Pixel-extraction from the reference photo was **blocked**: the reference
  exists only as a chat attachment, not as a file on disk, so there was
  nothing to sample.
- Trigger to revisit: if the reference image file or an official brand
  guide ever ships, sample/replace these values, re-render the PNGs in
  `public/brand/`, and delete this note.

## Repo & deploy notes (operational, not code)

- Local git identity is the placeholder `foodlink-dev`; no remote is
  configured. Pushing needs your GitHub PAT; portable git lives outside
  the repo. `.env` (real `VITE_API_URL`) is gitignored — only
  `.env.example` is committed.
- E2E assumes dev `.env` points at the live backend (`VITE_API_URL`);
  without it the specs fail fast naming the config (see `e2e/helpers.ts`).
- Share-link builds (e.g. Vercel) must leave `VITE_API_URL` **unset** so
  the app runs in labeled demo mode. Presentations always run from
  localhost (`:5173` + `:8000`), never from the share link.
