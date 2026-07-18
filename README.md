# Eword App

Version: `0.2.3`

Eword Mobile Visual Preview is an interactive browser prototype for the future iOS and Android app. It is still a static preview, but its screens and flows are shaped around the mobile product: dashboard, obligations, journal, sorting, and second-party confirmations.

## Included in this preview

- Mobile dashboard with current obligations.
- Totals for receivables, payables, overdue debt, and pending confirmations.
- Journal separated by loan type.
- Sorting by due date, amount, creation date, and status.
- Manual debt record creation through the centered `+` button.
- Confirmation queue for loans and payments.
- Profile/settings preview.
- Static GitHub Pages deployment via `gh-pages`.

## Version notes

`0.2.2` removes the "Upcoming actions" dashboard section to keep the preview focused on obligations and the journal.

`0.2.3` adds the centered `+` action in bottom navigation and a manual debt record form.

## Product direction

Target mobile product:

- React Native + Expo for iOS and Android.
- Supabase backend for authentication, sync, PostgreSQL storage, and realtime updates.
- Second-party confirmation for loans and payments.
- Push reminders and activity history.

## Data flow preview

1. User opens Eword on mobile.
2. Dashboard reads active loans and pending confirmations.
3. Journal groups records by debt type and applies the selected sort.
4. Confirmation requests model actions requiring the second party.
5. Future mobile app will replace static seed data with synced backend data.
