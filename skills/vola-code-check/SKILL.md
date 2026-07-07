---
name: vola-code-check
description: >
  VOLA's deep code check — a multi-pass review that actually runs the code, hunts the
  silent logic bugs that reading alone misses, and reports in plain Hebrew with
  paste-ready fixes. Use whenever Eyal asks to check, review, verify, QA or debug code
  or a tool file; says בדוק / תבדוק / תעבור על הקוד / יש באג / משהו לא עובד / לפני
  שליחה ללקוח; finishes a new version of any HTML tool; gets code back from Lovable;
  or pastes code asking "is this OK" — even if he never says the word "review". Also
  run it on nontrivial code YOU just generated (lead-machine versions, HTML tools,
  client pages) before delivering it. Not for SEO audits (vola-seo-audit), design
  taste (vola-design-dna), or writing new tools from scratch (vola-html-tool).
---

# VOLA Code Check

A review methodology built from what measurably finds the most bugs: Google's
eng-practices review guide, the Cisco/SmartBear study of 2,500 reviews, perspective-
based reading research, OWASP secure-review cheat sheets, and 2025–26 research on
making LLM reviews evidence-driven (which cut false positives ~90% while keeping
recall). Tuned for what VOLA ships: single-file Hebrew RTL HTML tools, Lovable
React sites, client pages. Eyal is not a developer — the review is the safety net.

## Iron rules (why each exists)

1. **A finding needs evidence.** Every finding must have a line number AND a concrete
   failure story: "user does X → sees Y wrong". If you can't tell the story with real
   values, you don't have a finding yet — you have a hunch. Keep digging or drop it.

2. **Kill your findings before reporting them.** After the passes, re-open the code at
   each finding's exact line and try to prove yourself wrong: is there a guard
   elsewhere? does that branch even run? did you misread? Only survivors get reported,
   labeled **ודאי** (confirmed by re-reading or by running) or **כנראה** (plausible,
   couldn't fully confirm). This adjudication step is the single biggest known
   false-positive killer in review research.

3. **Never review more than ~400 lines in one mental pass.** Beyond that, defect
   discovery collapses (Cisco study: 200–400 lines per session finds 70–90% of
   defects; more = you start skimming). For big files (the Lead Machine is thousands
   of lines): build a map first, then review subsystem by subsystem, each as its own
   fresh pass. Never "read the whole file top to bottom once" and call it reviewed.

4. **Running beats reading.** Over 60% of bugs in AI-generated code are *silent
   logic errors* — the code runs, looks right, and produces wrong answers. Eyeballs
   miss these; execution catches them. The runtime gate (Pass 0 and Pass 7) is not
   optional. A minute of running is worth an hour of reading.

5. **Read every line of the code under review.** Don't skim a function because it
   looks routine — that's exactly where the `sort()` without a comparator hides.
   (Chunking rule 3 exists so this stays possible.)

6. **No noise.** Style opinions are not bugs. Cap "nice to have" items at 5. If the
   code is clean, say it's clean — a padded report teaches Eyal to ignore reports.
   And always end with what you checked and found *solid* — trust is calibrated by
   both sides.

7. **Paid data is sacred.** Anything that touches scans Eyal paid for (Outscraper
   results, client records, financial entries) gets double scrutiny in Pass 4.
   Losing a client's data or a paid scan is the worst possible failure of any VOLA
   tool — worse than a crash.

## The passes

Run the passes in order. Each pass is a different set of glasses — research shows
reviewers with an assigned perspective find more unique defects than reviewers who
"just look for problems" in general.

### Pass 0 — Automated triage (before any human-style reading)

Run the bundled checker (requires Node, which is installed on Eyal's machine):

```
node scripts/check-file.mjs "path/to/file.html"
```

It syntax-checks every inline `<script>` block (catches truncation, unbalanced
braces — this class of bug has shipped before), and lists *leads*: dangerous sinks
(`innerHTML`, `document.write`, `eval`), every `localStorage`/`JSON.parse` call site
to verify guards on, TODO/FIXME markers, `console.log` leftovers. **Script output =
leads to investigate, not findings.** If the script can't run, do the syntax gate
another way (e.g. `node --check` on extracted JS) before proceeding.

If the file doesn't parse — stop. Report that first; nothing else matters yet.

Then list the file's **promises**: every button, feature, and piece of UI text that
promises behavior ("שמור", "ייצוא", "שלח"). This list drives Pass 2.

### Pass 1 — Map (only reading, no judging)

Outline: what functions exist, what state/variables live where, which localStorage
keys are used, which events are wired to what. For files over ~400 lines, write the
map down and split the review into subsystems (e.g. "scraping", "scoring", "export",
"UI rendering"). The map also exposes dead code and orphan handlers by itself.

### Pass 2 — Trace as the user (perspective 1)

Take the 3–5 real flows from the promises list. Execute each one mentally, line by
line, **with concrete realistic values** — not abstractly. Use VOLA-realistic data:

- a business called `מסעדת ג'ורג' בע"מ` (apostrophe! quotes!), phone `050-1234567`
- 0 records, 1 record, 200 records
- a price typed as `1,200` (with comma) and as `1200.50`

At each step write down what each variable actually holds. "Looks right" is not
tracing; "after line 340, `total` holds the string `'01200'`" is tracing. This is
the pass that catches the silent-logic majority: wrong sort, string arithmetic,
skipped first record, date off by one month.

### Pass 3 — Attack as the tester (perspective 2)

Sweep the edge-case taxonomy against every input and every flow:

- **Amounts:** 0 items / 1 item / many; empty string; null/undefined reaching a function
- **Boundaries:** first/last element, off-by-one in loops and `slice`, exactly-at-limit
- **Text:** Hebrew+English mixed, quotes `'` `"`, `<` `>` `&`, emoji, very long input, leading/trailing spaces
- **Numbers:** `0`, negatives, `1,200` with separators, floating point money (0.1+0.2), NaN propagation
- **Time:** clicking the same button twice fast (double-submit), refresh mid-action, two tabs open
- **Environment:** offline / API returns error or garbage / slow response, storage full, old data from a previous version

Ask of each: "what does the code do — crash, silently do the wrong thing, or handle
it?" Silent-wrong is the dangerous one.

### Pass 4 — Guard the money and the data (VOLA perspective)

The questions that matter most for Eyal's business:

- Is **every** `localStorage.setItem` inside try/catch? (Quota errors throw and crash mid-save.)
- Is **every** `JSON.parse` guarded? (One corrupt value = tool bricked on every load, data looks "gone".)
- Does anything destructive (delete, clear, overwrite) confirm first and/or keep a backup/export path?
- If the data schema changed since a previous version: is there migration for old saved data, or does the new version silently discard what the old one saved?
- Paid API responses (Outscraper etc.): saved raw **before** any processing that could throw? Retry/resume without paying twice?
- Are errors *visible*? An empty `catch {}` that then tells the user "נשמר ✓" is lying to the user — worse than crashing.

### Pass 5 — Security sweep (OWASP, scaled to a client-side tool)

- Grep the sinks: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
  `eval`, `new Function`, event-handler attributes built from strings. For each hit:
  does user-controlled or API-returned data reach it? If yes → XSS finding. Fix
  direction: `textContent`, or build DOM with `createElement`. A business name with
  an apostrophe or `<script>` in a Google-Maps result must render as text, ever.
- API keys in client-side code: can't be fully avoided in single-file tools — flag it
  honestly, recommend key restrictions (referrer/quota caps) instead of pretending.
- `target="_blank"` links get `rel="noopener"`; user data in `mailto:`/`tel:`/URL
  params gets `encodeURIComponent`.

### Pass 6 — Hebrew, RTL, and human copy (VOLA's market)

- Phone numbers, emails, URLs, mixed-digit strings inside RTL text: rendered inside
  `dir="ltr"` spans (or `<bdi>` for user-generated names)? A phone number without it
  displays scrambled — this is the highest-frequency RTL bug class.
- Directional icons/arrows point the right way in RTL; numbers formatted with
  `toLocaleString('he-IL')`; ₪ placed correctly; dates in Israeli format.
- Copy follows Eyal's standing rule: plain human Hebrew, English terms glossed,
  error messages say what happened AND what to do now. "שגיאה 500" is a bug too.
- Check mobile: RTL bugs appear disproportionately on small screens.

### Pass 7 — Run it for real

- Environment has browser preview tools (Cowork/Claude Code): open the file, click
  through the main flows from Pass 2, watch the console for errors, check the
  network tab if there are API calls. Screenshot as proof when useful.
- No browser available: extract the pure logic functions (scoring, totals, parsing,
  formatting) into a scratch Node file and run them against the Pass 2/3 inputs.
  This is the Lead Machine convention that has caught real bugs — keep it.
- Everything that was fixed gets re-run. A fix without a re-run is a guess.

## Reporting

Read `references/report-template.md` and follow it exactly. Summary of the format:
report in **plain Hebrew**, findings ranked by severity — 🔴 חוסם (data loss, crash,
security, wrong money — don't ship), 🟠 חשוב (a realistic client flow breaks),
🟡 כדאי (max 5, robustness/polish) — each finding with: what happens, where (line),
the concrete failure story, and a paste-ready fix. End with "מה בדקתי ויצא תקין"
and a bottom line: מוכן לשליחה או לא.

If Eyal asked to **check** — report only; he decides. If he asked to **check and
fix** — fix 🔴 and 🟠, then re-run Pass 0 and Pass 7 on the fixed file (regression
gate), and deliver as a new version file per the VOLA convention (never overwrite
the old version).

## Depth selector

- **Full check** (default for: a new version of a tool, anything before client
  delivery, first review of Lovable output): all passes.
- **Quick check** (Eyal asks about one function/section, or a tiny edit): Pass 0 on
  the whole file + Passes 2, 3 and 7 focused on the changed part only. Say
  explicitly that it was a quick check and what it did not cover.

## Stack-specific bug catalog

During Passes 3–6, read `references/pitfalls-web.md` — the distilled catalog of the
bugs that actually bite this stack (JS gotchas, storage, fetch, RTL, React/Lovable).
Grep-check the file against it; it is ordered by how often each class ships.

## Play nice with the rest of the toolbox

- Reviewing a git diff in a repo? The built-in `/code-review` skill is diff-aware —
  use it for the diff, then this skill's Passes 4, 6 and 7 for what it won't know
  (VOLA data rules, Hebrew/RTL, runtime).
- Working on the Lead Machine? `vola-lead-machine-dev` owns versioning and
  architecture conventions; this skill owns the review passes. Use both.
- Browser preview tools available? Prefer them for Pass 7 over mental simulation.
