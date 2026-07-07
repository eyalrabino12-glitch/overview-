# Report format (Hebrew, for Eyal)

The report is the product of the review. Eyal is not a developer: he reads the
report to decide "do I send this to a client or not". Write it in plain human
Hebrew, gloss English terms once, and make every finding actionable. Code
identifiers (function names, `innerHTML`) stay in English inside the Hebrew text.

## Rules

- Rank by severity. Within a severity, most damaging first.
- Every finding: what happens → where (line) → the concrete story → the fix
  (paste-ready when possible).
- Label each finding ודאי (confirmed by re-reading/running) or כנראה (plausible).
  Don't present a כנראה as a fact.
- 🟡 items: maximum 5. If there are more, keep the best 5 and say "יש עוד קטנות,
  לא דחוף".
- Always include "מה בדקתי ויצא תקין" — it calibrates trust and shows coverage.
- If the code is clean: say so plainly. Never invent findings to look thorough.
- Bottom line is a decision, not a shrug: מוכן לשליחה / מוכן אחרי תיקון X / לא לשלוח.

## Template

```markdown
# בדיקת קוד — [שם הקובץ] ([תאריך])

**שורה תחתונה:** [מוכן לשליחה ✅ / מוכן אחרי תיקון הסעיפים האדומים 🔴 / לא לשלוח עדיין ❌]
[משפט אחד: מה מצב הקובץ בגדול.]

## 🔴 חוסם — לתקן לפני שמישהו רואה את זה ([N])

### 1. [כותרת קצרה במילים פשוטות]  `[ודאי]`
**מה קורה:** [הסבר בעברית פשוטה, בלי ז'רגון]
**איפה:** שורה [X], בפונקציה `name()`
**הסיפור:** [תרחיש קונקרטי: "לקוח מזין 1,200 ₪ → הכלי שומר 1 ₪"]
**התיקון:**
```js
[קוד מוכן להדבקה]
```

## 🟠 חשוב — תרחיש אמיתי שנשבר ([N])
[אותו מבנה]

## 🟡 כדאי — חיזוקים (עד 5)
- [שורה X] [משפט אחד + כיוון תיקון]

## מה בדקתי ויצא תקין ✅
- [למשל: כל 4 הזרימות המרכזיות עברו הרצה — הוספה, עריכה, מחיקה, ייצוא]
- [למשל: אין XSS (הזרקת קוד דרך טקסט של משתמש) — כל התצוגה עוברת textContent]
- [מה הורץ בפועל: node check עבר, נפתח בדפדפן, נלחצו הכפתורים]

## מה לא נבדק
- [אם זו בדיקה מהירה — להגיד מה לא כוסה. אם בדיקה מלאה ריק — למחוק את הסעיף]
```

## Example finding (the tone to hit)

### 1. סכומים עם פסיק נשמרים לא נכון  `[ודאי]`
**מה קורה:** אם מקלידים סכום עם פסיק — למשל 1,200 — הכלי שומר רק 1 ₪.
**איפה:** שורה 214, בפונקציה `saveDeal()`
**הסיפור:** לקוח סוגר עסקה של 1,200 ₪ ומקליד "1,200" כמו שכולם מקלידים.
`parseFloat` עוצר בפסיק ושומר 1. הדוח החודשי יראה הכנסה של 1 ₪ במקום 1,200 ₪.
**התיקון:**
```js
const amount = Number(String(input.value).replace(/[,\s₪]/g, ''));
if (Number.isNaN(amount)) { showError('הסכום לא תקין — אפשר להקליד רק מספרים'); return; }
```
