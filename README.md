# Eword App

Version: `1.0.1`

Mobile-first debt tracker rebuilt from the available chat context and UI screenshot.

## What is included

- Summary card: confirmed amount owed to you and pending amount.
- Add debt form with person, amount, comment, and status.
- Filters for all, confirmed, and pending debts.
- Confirm/pending toggle and delete action.
- Local browser storage through `localStorage`.
- Static app: no backend, no database, no secrets.

## Run locally

```bash
npm run preview
```

Then open:

```text
http://localhost:4173
```

## Data flow

1. User enters debt details in the browser form.
2. `app.js` validates the person and amount.
3. The new debt is added to in-memory state.
4. The full list is saved to browser `localStorage`.
5. Totals are recalculated for confirmed and pending debts.
6. The UI re-renders the summary card and debt list.

## Version notes

`1.0.1` is the first rebuilt version created for GitHub upload.
