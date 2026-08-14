# Eword Roadmap

## Phase 1: Stable Web Prototype

Goal: keep the approved black-orange interface as the product baseline and make the data layer real enough to test.

- Keep version `1.0.1` as the canonical UI baseline.
- Store the approved app state in clean, current-version files only.
- Connect Supabase through the profile screen.
- Run `schema.sql` in the Supabase project.
- Enable Anonymous Sign-Ins for early testing.
- Verify create, read, and confirmation update flows against Supabase.

## Phase 2: Real Product Data Model

Goal: move from a single-user prototype to a reliable debt accounting model.

- Replace anonymous-only testing with phone/email auth.
- Add user profiles.
- Add counterparties/contacts as first-class records.
- Split debts, payments, confirmation requests, and activity history into separate tables.
- Add database constraints for payment totals, statuses, and due dates.
- Add RLS tests for user isolation.

## Phase 3: Confirmation Workflow

Goal: make two-sided confirmation trustworthy.

- Add invite links or contact matching.
- Store who requested and who must confirm each action.
- Confirm new debts, repayments, edits, and closures.
- Add immutable activity events for audit history.
- Move sensitive workflow mutations to Supabase Edge Functions if direct client writes become too permissive.

## Phase 4: Mobile App

Goal: prepare for Google Play and App Store.

- Move UI to React Native + Expo.
- Reuse the current visual system and flows.
- Keep Supabase Project URL and public key in client config.
- Keep all secrets out of the app bundle.
- Use EAS build profiles for development, preview, and production.
- Add crash/error monitoring before beta.

## Phase 5: Store Readiness

Goal: release safely.

- Add privacy policy and terms.
- Add account deletion flow.
- Add data export.
- Add onboarding and empty states.
- Add backups/export strategy for critical financial records.
- Test Android and iOS builds on real devices.
- Prepare screenshots, descriptions, and review notes.

## Immediate Next Steps

1. Run the Supabase schema in SQL Editor.
2. Enable Anonymous Sign-Ins.
3. Copy the public/publishable key into the app profile screen.
4. Create one test record in the app.
5. Confirm the row appears in `public.debt_records`.
