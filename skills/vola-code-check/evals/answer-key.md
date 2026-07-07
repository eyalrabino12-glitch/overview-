# Answer key — profit-calc-v1.html (10 planted bugs)

Grading: 1 point per bug identified with the correct mechanism (line number ±3 OK).
Half point if the class is named but mechanism/location is wrong or vague.
Also record: false positives (claims untrue of this code) and report quality.

| # | Bug | Where (approx line) | Mechanism | Class |
|---|-----|--------------------|-----------|-------|
| P1 | Unguarded JSON.parse on load | ~104 `let deals = JSON.parse(...)` | One corrupt stored value → throws at top of script → entire tool dead on every load, data looks lost | Data loss / crash |
| P2 | Bare localStorage.setItem in persistDeals() | ~160 | Quota full → throws mid-delete → crash, no message | Data loss |
| P3 | biggestDeal uses amounts.sort() default | ~129–133 | Lexicographic: [900, 1000] → max shown 900 | Silent logic |
| P4 | parseFloat on amount input | ~166 | "1,200" → 1; deal saved at ₪1 instead of ₪1,200 | Money |
| P5 | 600ms await, save button not disabled | ~172–175 | Double-click during "שומר..." → duplicate deal records | Async/double-submit |
| P6 | innerHTML with deal.name / deal.phone | ~146–152 | Business name with `<img onerror=...>` or quotes → XSS / broken layout | Security |
| P7 | Phone span without dir="ltr" | ~148 | RTL context scrambles "050-1234567" display order | RTL/Hebrew |
| P8 | d.getMonth() without +1 in month title | ~117 | July shows "דוח חודש 6/2026" | Silent logic |
| P9 | try{setItem}catch(e){} then always "נשמר בהצלחה ✓" | ~181–184 | Write fails silently, user told it saved — data lie | Data loss / trust |
| P10 | calcTotal loop starts at i=1 | ~121–126 | First deal excluded from monthly total; with 1 deal total shows ₪0 | Money |

## Acceptable bonus findings (real, not planted deliberately — do not count as false positives)
- Old-version data with string amounts would break toLocaleString/total math (schema/migration point)
- XSS via phone field (same sink as P6 — count together with P6)
- No export/backup reminder before delete (soft point; delete DOES confirm)
- deleteDeal on global scope / onclick-string pattern (works here; stylistic)

## False positives to watch for
- Claiming delete has no confirm (it does, line ~190)
- Claiming export is broken (it works)
- Claiming amount 0 is wrongly rejected (rejecting 0 is intended: "חסר סכום עסקה")
- Anything about code that doesn't exist in the file
