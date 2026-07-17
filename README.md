# Eword App

Version: `1.1.0`

Eword is a mobile-first personal loan tracker for debts between individuals. This version is a static PWA-style prototype: it runs in the browser, stores data locally, and does not require a backend, database, or secrets.

## What is included

- Track loans you gave and loans you borrowed.
- Store borrower/lender name, amount, repayment due date, status, and note.
- See totals for active balance, receivables, payables, and overdue balance.
- Record partial repayments and automatically close fully repaid loans.
- Filter the journal by all, receivable, payable, and overdue loans.
- Export current data as JSON.
- Reset demo data for testing.

## Run locally

```bash
npm run preview
```

Then open:

```text
http://localhost:4173
```

## Data flow

1. A user enters loan details in the browser form.
2. `app.js` validates the person and amount.
3. The loan is added to in-memory state.
4. The full loan journal is saved to browser `localStorage`.
5. Totals are recalculated from active loans and repayments.
6. The UI re-renders the summary panel and journal.
7. When the user records a payment, the payment is applied to the selected loan, saved locally, and the visible balance updates.

## Architecture notes

Current version:

- Frontend: plain HTML, CSS, and JavaScript.
- Storage: browser `localStorage`.
- Deployment: any static host, including GitHub Pages.
- Authentication: none.

Recommended next version:

- Add a backend API for shared multi-device data.
- Add user authentication by phone, email, Telegram, or passkey.
- Move loans, payments, and parties into a database.
- Add invite links so the second party can confirm a loan.

## Version notes

`1.1.0` expands the first rebuilt version from a simple debt list into a fuller personal loan journal.
