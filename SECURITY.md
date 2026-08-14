# Security Rules

Eword is designed with one core assumption: anything shipped to a browser, Android app, or iOS app can be inspected by a user.

## Allowed In Public Code

These values may appear in GitHub, the static preview, and future mobile client builds:

- Supabase Project URL
- Supabase public/publishable key
- table names, column names, and client-side validation rules
- public app version and UI assets

The public/publishable key identifies the Supabase project, but it is not a database password. It is safe only when Row Level Security is enabled and policies are correct. End users should not type backend configuration in the app; the client build owns public configuration.

## Never Commit Or Ship

These values must never be committed to GitHub, added to static HTML/JS, or bundled into Android/iOS builds:

- Supabase `service_role` key
- Supabase secret keys
- database password or connection string
- SMTP credentials
- Apple/Google signing credentials
- payment provider secret keys
- private API tokens

If one of these values is exposed, rotate it immediately in the provider dashboard.

## Data Access Model

- Client apps use Supabase Auth and the public/publishable key.
- Tables exposed through the Data API must have Row Level Security enabled.
- Every user-owned table must include an ownership column such as `owner_user_id`.
- Policies must combine `to authenticated` with an ownership check like `(select auth.uid()) = owner_user_id`.
- Sensitive cross-user workflows must move to Edge Functions or a backend service before production.

## Current Supabase Project

- Project ref: `zmgxfjocqwratpwwrrqx`
- Project URL: `https://zmgxfjocqwratpwwrrqx.supabase.co`
- Public key: added to client build configuration after RLS is enabled
- Service role key: never used in the frontend

## Release Strategy

GitHub Pages and RawGitHack are preview surfaces only. They are useful while designing the product, but they are not the production backend and should not be treated as the final deployment architecture.

For App Store and Google Play releases:

- build with React Native + Expo or a native shell;
- keep public Supabase config in the client build;
- keep secrets in Supabase Edge Functions, backend infrastructure, or Expo/EAS secret storage;
- validate all important authorization in Postgres RLS or backend code;
- test data isolation before beta release.
