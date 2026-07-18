# Eword App

Version: `0.2.7`

Eword Mobile Visual Preview is an interactive browser prototype for the future iOS and Android app. It is still a static preview, but its screens and flows are shaped around the mobile product: dashboard, obligations, journal, sorting, and second-party confirmations.

## Included in this preview

- Mobile dashboard with current obligations.
- Dashboard histogram with monthly debt timeline and net-position trend.
- Totals for receivables, payables, overdue debt, and pending confirmations.
- Journal separated by loan type.
- Sorting by due date, amount, creation date, and status.
- Manual debt record creation through the centered `+` button.
- SQL accounting schema that stores money as integer Russian kopecks.
- Confirmation queue for loans and payments.
- Profile/settings preview with an in-app update log.
- Static GitHub Pages deployment via `gh-pages`.

## Version notes

`0.2.2` removes the "Upcoming actions" dashboard section to keep the preview focused on obligations and the journal.

`0.2.3` adds the centered `+` action in bottom navigation and a manual debt record form.

`0.2.4` updates the manual record form with required obligation type, name, issue date, due date, comment, and formatted amount fields.

`0.2.5` stores debt amounts internally as integer kopecks and keeps ruble formatting only for frontend display.

`0.2.6` applies the approved orange-black visual direction and adds an in-app update log under profile settings.

`0.2.7` adds a dashboard histogram with a monthly timeline and net-position trend line.

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
4. Dashboard visualizes monthly debt changes as bars and net position as a trend line.
5. Confirmation requests model actions requiring the second party.
6. Future mobile app will replace static seed data with synced backend data.

## Accounting storage rule

Frontend users enter and see rubles, for example `1 000,00 ₽`.

Application and SQL storage keep the same value as integer kopecks:

- `1 000,00 ₽` -> `100000`
- `1 000 000,00 ₽` -> `100000000`

Use `schema.sql` as the first draft of the accounting table.
