# Round-Up Calculator — My Notes

## What This Is
A tool that takes your bank statement and shows how much you would have automatically saved/invested through micro round-ups on every transaction. Built to validate the core idea before building the real product.

---

## What's Working (as of June 1, 2026)
- Upload Axis Bank PDF → get full round-up dashboard
- Auto rule picks the right interval per transaction size
- Deployed on Vercel — shareable link
- Redact script to anonymize statements before sharing

## Open Questions / Things to Figure Out
- [ ] What's the actual "aha moment" for users? Is it the yearly projection or the per-transaction view?
- [ ] What's the right round-up rule for most people? Auto feels right but need real feedback
- [ ] How do we handle people on other banks? (HDFC, ICICI, SBI not tested yet)
- [ ] Should the app show a goal (house, vacation, retirement) alongside the numbers?
- [ ] Who exactly is the target user? Salaried 22–30? Students? Both?

## Product Thinking
The core insight: people don't invest because it feels like sacrifice. Round-ups feel invisible.
The "aha moment" we're testing: seeing YOUR actual numbers from YOUR actual spending.

What the app currently says:
> "Out of ₹61,460 spent across 55 transactions, you would have automatically saved ₹1,330 — at this rate, that's ₹15,966/year."

Is that compelling enough to make someone sign up? → That's what we need to find out.

## Next Steps
1. Share with 5–10 real people, watch them use it
2. Ask: "Would you have set this up if it was live?" — that's the only question that matters
3. Add HDFC/ICICI support (most common banks)
4. Think about what happens AFTER the "aha moment" — what does the user do next?

## Tech Notes
- Runs locally: `node server.js` → http://localhost:3456
- Push to main branch → auto-deploys to Vercel
- Add a new bank: use `/debug` endpoint locally to see raw PDF text, then add parser in `server.js`
- Anonymize a statement: `node redact.js input.pdf output.pdf`

## Business Reality Check
- India round-up investing = proven model (Jar, Spare8 already exist)
- Differentiation needs to be clear before building further
- Regulatory path (RBI, SEBI, Account Aggregator) is months of work — validate first
- The calculator IS the MVP — it doesn't need to do more until users ask for it
