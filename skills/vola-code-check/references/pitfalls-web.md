# Web-stack bug catalog (ordered by how often each class ships)

How to use: during Passes 3–6, walk this list against the file. Each entry is:
the smell → why it's a bug → what good looks like. These are the classes that
actually bite VOLA's stack (vanilla JS single-file tools, localStorage, fetch to
paid APIs, Hebrew RTL UI, Lovable React).

## 1. Storage & data loss (Pass 4)

- `JSON.parse(localStorage.getItem(...))` bare → one corrupt/legacy value and the
  tool throws **on every load** — to Eyal it looks like all data vanished →
  wrap in try/catch, on failure keep the raw string aside (`_backup_<key>_<date>`)
  and start clean; never silently discard.
- `localStorage.setItem` bare → quota errors **throw** (storage is ~5MB in UTF-16 —
  Hebrew text is 2 bytes/char, so it fills twice as fast as English) → try/catch
  around every write; on failure tell the user and offer export.
- Storing images/base64 in localStorage → eats the whole quota in a few saves →
  keep only text/JSON; images stay in memory or files.
- New version changes the data shape but reads the old key → old saved work ignored
  or crashes → version the schema (`{v: 2, data: ...}`) and migrate on load.
- Destructive actions (`clear`, delete, overwrite) with no confirm and no export
  path → one misclick kills a client's records → confirm + keep a one-click JSON
  export/backup somewhere in the tool.
- Two tabs open → last write wins, first tab's work silently lost → at minimum warn;
  a `storage` event listener or a session lock is better.

## 2. Silent logic / money math (Passes 2–3)

- `arr.sort()` on numbers → lexicographic: `[9, 80, 700]` sorts to `[700, 80, 9]` →
  `sort((a, b) => a - b)`.
- `parseFloat("1,200")` → `1` (stops at the comma). Israeli users type commas →
  strip separators first: `Number(str.replace(/[,\s₪]/g, ''))`, then validate `isNaN`.
- `+` between a string and a number → concatenation: `"100" + 50` is `"10050"` →
  values from `input.value` and storage are **strings**; convert at the boundary once.
- Money in floats → `0.1 + 0.2 !== 0.3`, totals drift by agorot → keep amounts in
  agorot as integers, or round only at display time.
- `getMonth()` is 0-based → "יולי" shown as "06" or off-by-one month in reports →
  `+1` for display, or `toLocaleDateString('he-IL')`.
- `new Date("07/06/2026")` → parsed as July 6 (US order), not June 7 → never parse
  dd/mm strings with `new Date`; store ISO (`2026-07-06`), display he-IL.
- Loop starts at 1 / `slice` off-by-one → first or last record missing from totals —
  looks fine with test data, wrong with real data → trace with 3 concrete records.
- `==` coercion → `"0" == false` is true; a legit `0` amount treated as "empty" →
  use `===`, and check emptiness explicitly (`value === ''`), not truthiness.
- `NaN` propagation → one bad field turns every downstream total into `NaN`,
  UI shows "₪NaN" → validate at input; `Number.isNaN` guards before aggregating.

## 3. Async & double-actions (Pass 3)

- Save/submit button not disabled during async work → double-click = duplicate
  record or double API charge → disable on click, re-enable in `finally`.
- `fetch` without `.catch` / without checking `res.ok` → offline or a 404 page gets
  `JSON.parse`d → crash or garbage saved → check `res.ok`, catch, show a human
  message with a retry button.
- Paid API call result processed before being saved → any throw during processing
  loses what was paid for → save the raw response first, then process (the
  Outscraper rule).
- No timeout → a hung request leaves the tool on "טוען..." forever →
  `AbortSignal.timeout(30000)` and a real error message.
- `forEach(async ...)` → doesn't wait; "done" fires before the work is done →
  `for...of` with `await`, or `Promise.all`.
- `var` in a loop with handlers/closures → every handler sees the last value →
  `let`/`const`.

## 4. XSS & security (Pass 5)

- `el.innerHTML = ...anything with user/API data...` → a business name from Google
  Maps containing `<img onerror=...>` runs code in the tool → `textContent` for
  text; `createElement` when structure is needed. Same for `insertAdjacentHTML`,
  `outerHTML`, `document.write`, handler attributes built from strings.
- Data from URL params (`location.search`) into the DOM → link-borne XSS → same rule.
- API keys in the file → unavoidable in single-file tools; flag honestly and
  restrict the key (referrer lock, quota cap) rather than pretend it's secret.
- `target="_blank"` without `rel="noopener"` → opened page can redirect the opener.
- User data in `mailto:`/`tel:`/`wa.me` links unencoded → broken or injectable →
  `encodeURIComponent`.

## 5. Hebrew / RTL (Pass 6)

- Phone numbers, emails, URLs, addresses with digits inside RTL text without
  `dir="ltr"` → displayed scrambled (`050-1234` becomes `1234-050`-ish) → wrap in
  `<span dir="ltr">`; user-generated mixed names in `<bdi>`.
- Directional arrows/icons not flipped → "next" points backwards in RTL.
- `text-align: left` hardcoded → use `start`/`end` or rely on `dir="rtl"`.
- Shadows/gradients don't auto-flip with `dir` → check visual balance manually.
- Numbers/currency: `toLocaleString('he-IL')`, ₪ position consistent; dates he-IL.
- Placeholder/`input` alignment for LTR content (phone, email fields) → those
  specific inputs get `dir="ltr"` with `text-align: end` as needed.
- Copy rules (Eyal's standard): plain human Hebrew, gloss English terms once
  (e.g. "ייצוא (Export)"), error messages = what happened + what to do now.

## 6. React / Lovable output (when reviewing React code)

- `key={index}` on lists that reorder/delete → state sticks to the wrong row →
  key by stable id.
- `useEffect` with missing deps / stale closure → works on first render, wrong
  after updates → include deps or use functional updates.
- State mutation (`arr.push` on state) → UI doesn't re-render → copy then set.
- Fetch in `useEffect` without cleanup/AbortController → setState on unmounted
  component, race between fast navigations.
- Conditional hooks (early return before a hook) → crash "Rendered fewer hooks".
- Forms: uncontrolled→controlled warnings usually mean `value={undefined}` on
  first render → default every field (`?? ''`).

## 7. Shipping hygiene (Pass 0 output)

- `console.log` with client data left in → remove or gate behind a debug flag.
- `TODO`/`FIXME` in a "ready" version → either do it or log it visibly, not in code.
- Dead functions / commented-out blocks → delete; the file is the product.
- Version marker in the UI matches the filename version (VOLA convention).
