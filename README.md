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
- Supabase connection panel in the profile screen.

## Data And Entities

The current app models these core entities:

- `debt_records`: personal debt records with counterparty, direction, amount, paid amount, due date, status, note, creation date, and second-party confirmation state.
- `confirmation_requests`: pending actions that require the other side to approve or decline.

Money is stored internally as integer Russian kopecks and formatted as rubles only for display.

Examples:

- `1 000,00 ₽` -> `100000`
- `1 000 000,00 ₽` -> `100000000`

## Where Records Are Stored

Without Supabase settings the app runs in demo mode: records live only in the browser session and reset when the demo state is restored.

With Supabase connected, records are stored in the project database:

- loan records: `public.debt_records`
- confirmation requests: `public.confirmation_requests`
- ownership: `owner_user_id`, tied to the current Supabase Auth user

The frontend stores only the Supabase Project URL and public/publishable key in `localStorage`. Never put a `service_role` or secret key into the app.

## Supabase Setup

1. Create or open a Supabase project.
2. Open SQL Editor and run the full contents of `schema.sql`.
3. In Authentication settings, enable Anonymous Sign-Ins.
4. In the app, open `Профиль` -> `Supabase`.
5. Paste the Project URL and public/publishable key.
6. Click `Подключить` and then use the sync button in the app header.

`schema.sql` enables Row Level Security and grants access to the `authenticated` role. Anonymous Supabase users still use the `authenticated` database role after `signInAnonymously()`, so records remain private to the generated user id.

## Active Files

- `index.html`: app markup and screen structure.
- `app.js`: app state, rendering, sorting, form handling, timeline calculations, Supabase sync, and formatting.
- `supabase-store.js`: Supabase client setup, anonymous auth, reads, inserts, and confirmation updates.
- `eword-theme-1.0.1.css`: black-orange mobile theme.
- `eword-supabase-1.0.1.css`: Supabase settings panel styles.
- `eword-chart-1.0.1.css`: dashboard timeline chart styles.
- `manifest.json`: PWA metadata.
- `schema.sql`: Supabase PostgreSQL schema, indexes, grants, and RLS policies.

## Product Direction

Target mobile product:

- React Native + Expo for iOS and Android.
- Supabase backend for authentication, sync, PostgreSQL storage, and realtime updates.
- Second-party confirmation for loans and payments.
- Push reminders and activity history.
