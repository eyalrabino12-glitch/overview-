# vola-code-check — iteration 1 benchmark (planted-bugs eval, 1 test case)

Test: profit-calc-v1.html (201 lines, Hebrew RTL single-file tool) with 10 planted
bugs across data-loss, money-math, async, XSS, RTL and UX-lie classes. Same prompt,
same model, same Eyal context for both runs; only difference = the skill.

| | with_skill | without_skill (baseline) |
|---|---|---|
| Assertions passed | 12/12 | 12/12 (P7 graded leniently — mentioned only as an aside) |
| Planted bugs found | 10/10 | 10/10 (9.5 strict) |
| Findings proven by EXECUTING the code | **6** (Node run log in report) | **0** (asked Eyal to reproduce manually) |
| False positives | 0 | 0 |
| Confidence labels (ודאי/כנראה) | yes, every finding | no |
| Coverage statement (checked-and-clean + not-checked) | yes, 7 areas + honest gaps | partial ("מה כן טוב") |
| Fixes | complete paste-ready replacements | mostly one-line directions |
| Bonus unplanted real bug (no month filtering) | found (🟠#1) | found (#5) |
| Tokens | 85,907 | 62,808 |
| Duration | 490s | 326s |
| Tool uses | 9 | 3 |

## Analyst notes

- **Detection hit the ceiling on both sides.** A 201-line file with one eval can't
  separate the two on find-rate — the base model is already strong at this size.
  The skill's detection guarantees (≤400-line chunking, map-first) are designed for
  the multi-thousand-line Lead Machine case, which this eval does not exercise.
- **The real, observed deltas:** execution proof (6 findings backed by a recorded
  Node run vs. zero — baseline shipped "verify it yourself" steps to a non-developer),
  calibrated confidence labels, explicit coverage/not-covered statement, and
  paste-ready fixes. These are exactly the evidence-first behaviors the 2025–26
  false-positive research says make review output trustworthy.
- **Cost of rigor:** +37% tokens, +50% wall time. Acceptable for pre-delivery checks;
  the skill's "quick check" mode exists for smaller questions.
- **Non-discriminating assertions:** 11 of 12 passed on both sides — future evals
  should plant subtler bugs (cross-function state bugs, migration bugs) and use a
  bigger file to make detection discriminate.
- Eval viewer (generate_review.py) not generated: no Python on this machine
  (WindowsApps stub only). Raw outputs + gradings live next to this file.
