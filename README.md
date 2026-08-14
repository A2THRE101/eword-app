# Eword App

Version: `1.0.1`

Eword is a mobile interface preview for personal loan accounting. Version `1.0.1` is the canonical working version of the app and is based on the approved black-orange mobile interface.

## Current Interface

- Mobile dashboard with current obligations.
- Debt timeline chart with monthly changes and net-position trend.
- Totals for receivables, payables, overdue debt, and pending confirmations.
- Journal grouped by loan type and filter state.
- Sorting by due date, amount, creation date, and status.
- Manual debt record creation through the centered `+` button.
- Confirmation queue for loans and payments.
- Profile/settings screen with the current app version.

## Data And Entities

The current preview models these core entities:

- `loans`: personal debt records with person, direction, amount, paid amount, due date, status, note, creation date, and second-party confirmation state.
- `confirmations`: pending actions that require the other side to approve or decline.

Money is stored internally as integer Russian kopecks and formatted as rubles only for display.

Examples:

- `1 000,00 ₽` -> `100000`
- `1 000 000,00 ₽` -> `100000000`

Use `schema.sql` as the first draft of the accounting table.

## Active Files

- `index.html`: app markup and screen structure.
- `app.js`: app state, rendering, sorting, form handling, timeline calculations, and formatting.
- `eword-theme-1.0.1.css`: black-orange mobile theme.
- `eword-chart-1.0.1.css`: dashboard timeline chart styles.
- `manifest.json`: PWA metadata.
- `schema.sql`: first backend storage draft.

## Product Direction

Target mobile product:

- React Native + Expo for iOS and Android.
- Supabase backend for authentication, sync, PostgreSQL storage, and realtime updates.
- Second-party confirmation for loans and payments.
- Push reminders and activity history.
