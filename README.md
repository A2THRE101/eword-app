# Eword App

Version: `1.0.1`

Eword is a mobile-first personal loan accounting product. Version `1.0.1` is the canonical black-orange UI baseline. The current static web build is only a preview surface for product design and data-flow testing; new implementation decisions should be compatible with the future App Store and Google Play app.

## Current Interface

- Mobile dashboard with current obligations.
- Debt timeline chart with monthly changes and net-position trend.
- Totals for receivables, payables, overdue debt, and pending confirmations.
- Journal grouped by loan type and filter state.
- Sorting by due date, amount, creation date, and status.
- Manual debt record creation through the centered `+` button.
- Confirmation queue for loans and payments.
- Profile/settings screen with the current app version.
- Sync status panel for the Supabase backend.

## Data And Entities

The current app models these core entities:

- `debt_records`: personal debt records with counterparty, direction, amount, paid amount, due date, status, note, creation date, and second-party confirmation state.
- `confirmation_requests`: pending actions that require the other side to approve or decline.

Money is stored internally as integer Russian kopecks and formatted as rubles only for display.

Examples:

- `1 000,00 ₽` -> `100000`
- `1 000 000,00 ₽` -> `100000000`

## Where Records Are Stored

Without a configured Supabase publishable key the app runs in demo mode. Demo records live only in the browser session and are not product storage.

With Supabase configured in the app build, records are stored in the project database:

- loan records: `public.debt_records`
- confirmation requests: `public.confirmation_requests`
- ownership: `owner_user_id`, tied to the current Supabase Auth user

The app build may include the Supabase Project URL and public/publishable key. It must never include a `service_role` key, secret key, database password, or connection string.

## Supabase Setup

Current project URL: `https://zmgxfjocqwratpwwrrqx.supabase.co`

1. Open the Supabase project.
2. Open SQL Editor and run the full contents of `schema.sql`.
3. In Authentication settings, enable Anonymous Sign-Ins for early testing.
4. Add the public/publishable key to the app build configuration after RLS is enabled.
5. Use the app sync button to verify reads and writes.

For the future Expo app, this maps to `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are public client values. Secrets belong only in backend code, Supabase Edge Functions, or protected build infrastructure.

`schema.sql` enables Row Level Security and grants access to the `authenticated` role. Anonymous Supabase users still use the `authenticated` database role after `signInAnonymously()`, so records remain private to the generated user id.

## Project Rules

- Security rules: `SECURITY.md`
- Forward roadmap: `ROADMAP.md`

GitHub Pages and RawGitHack are preview surfaces only. Users of the published mobile apps will not interact with GitHub.

## Active Files

- `index.html`: app markup and screen structure for the current preview.
- `app.js`: app state, rendering, sorting, form handling, timeline calculations, Supabase sync, and formatting.
- `supabase-store.js`: Supabase client setup, anonymous auth, reads, inserts, and confirmation updates.
- `eword-theme-1.0.1.css`: black-orange mobile theme.
- `eword-supabase-1.0.1.css`: Supabase sync status panel styles.
- `eword-chart-1.0.1.css`: dashboard timeline chart styles.
- `manifest.json`: PWA metadata for preview.
- `schema.sql`: Supabase PostgreSQL schema, indexes, grants, and RLS policies.

## Product Direction

Target mobile product:

- React Native + Expo for iOS and Android.
- Supabase backend for authentication, sync, PostgreSQL storage, and realtime updates.
- Second-party confirmation for loans and payments.
- Push reminders and activity history.
