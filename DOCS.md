# Round-Up Calculator — Project Docs

## What It Does
Upload a bank statement (PDF or CSV) → see how much you would have automatically invested through micro round-ups on every transaction.

Example: Spend ₹487 → rounds to ₹500 → ₹13 saved. Happens on every transaction, invisibly.

---

## Running Locally
```bash
cd round-up-calculator
node server.js
# open http://localhost:3456
```

## Deploying
Push to `main` → Vercel auto-deploys.
```bash
git add .
git commit -m "your message"
git push
```

---

## How the Round-Up Logic Works

**Rule:** Always round to the **next** multiple — never returns ₹0, even if the amount is already a round number.

| Amount | Rule | Saved |
|--------|------|-------|
| ₹8     | ₹10  | ₹2    |
| ₹20    | ₹10  | ₹10   |
| ₹187   | ₹50  | ₹13   |
| ₹450   | ₹50  | ₹50   |
| ₹2,277 | ₹100 | ₹23   |

**Auto rule (default):**
- Spend < ₹100 → round to next ₹10
- Spend ₹100–₹999 → round to next ₹50
- Spend ₹1,000+ → round to next ₹100

---

## Bank Support

### Axis Bank (fully working)
- Auto-detected via "Axis Bank" / "UTIB" in PDF header
- Parser uses **balance-delta method**: if balance decreased after transaction → debit, if increased → credit
- Each transaction line ends with: `amount   balance3digitBranchCode` (e.g. `221.00   8050.51018`)
- Transactions often span multiple lines — description accumulated between date lines

### Other banks (generic fallback)
- Looks for `Dr` / `DR` labels on debit amounts
- Works for HDFC, ICICI style — not fully tested

### Adding a new bank
1. Start the server locally (`node server.js`)
2. POST to `/debug` with the PDF to see raw extracted text
3. Identify the pattern for debit amounts
4. Add a `parseXxxBank(text)` function in `server.js` and register it in `detectBank()`

---

## Anonymising a Statement
Strips all personal info (name, address, PAN, account number) and creates a clean PDF with just the transaction table.

```bash
node redact.js input.pdf output.pdf
```

Output has columns: Date | Particulars | Debit | Credit | Balance

---

## Project Structure
```
round-up-calculator/
├── server.js          # Express app — bank parsers, round-up logic
├── api/
│   └── index.js       # Vercel serverless entry point
├── public/
│   └── index.html     # Frontend — upload UI + dashboard
├── redact.js          # PDF anonymiser script
├── vercel.json        # Routes all traffic through Express
├── DOCS.md            # This file
└── MY_NOTES.md        # Product thinking & next steps
```

---

## Key Decisions & Why

**Why balance-delta for Axis Bank?**
Axis Bank PDFs don't label amounts as Dr/Cr — they just show the number. The only reliable way to know if it's a debit is to check whether the balance went up or down.

**Why always round to NEXT multiple?**
Original logic returned ₹0 if the amount was already a multiple (e.g. ₹50 with ₹50 rule). That felt wrong — the user should always save something. Now ₹50 with ₹50 rule → saves ₹50 (jumps to ₹100).

**Why route all traffic through Express on Vercel?**
Vercel's static file routing from `public/` didn't work reliably with the explicit builds config. Express already serves static files via `express.static`, so it's simpler to let it handle everything.

**Why pdf-parse v1.1.1?**
v2.x has a completely different class-based API. v1.1.1 exports a simple async function — much easier to use.

**Why internal import `pdf-parse/lib/pdf-parse.js`?**
The main entry of pdf-parse v1.1.1 tries to load test PDF files on import, which fails in Vercel's serverless environment. The internal path skips that.
