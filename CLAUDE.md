# MeLedger

Voice-first personal finance tracker and advisor for Android (Uganda first). Users log money mostly by speaking; keyboard is always available. Works fully offline without an account; AI parsing, advisor, sync and Luganda voice are Pro (account + simulated payment for now).

## Read first
- Full spec and milestones: `docs/BUILD_PROMPT.md` — read it before starting any milestone.
- Design inspiration images: `docs/design/` — match their layout, cards, spacing and colours, adapted to Material 3 on Android.
- Reference domain sheets (income, expenses, categories, goals): `docs/design/reference/`.

## Stack (do not change without asking)
- Monorepo (pnpm workspaces): `apps/mobile`, `apps/api`, `packages/shared`, `supabase/`.
- Mobile: Expo SDK 57 (React Native 0.86), TypeScript strict, expo-router, react-native-paper (MD3), Material icons only, Zustand, TanStack Query, expo-sqlite + Drizzle, MMKV, expo-speech-recognition. **Android only.**
- Backend: **NestJS** (`apps/api`). Supabase Postgres with RLS.
- **Auth: Supabase Auth owns all users, sign-up and sign-in.** The app signs in with `@supabase/supabase-js`; NestJS only verifies the Supabase access token with a global guard. Never build a users table or token issuing in NestJS.
- AI: Vercel AI SDK + `@ai-sdk/google`. Parsing `gemini-3.5-flash-lite`, advisor `gemini-3.6-flash`, both from env vars. Use `generateText` with an `output` schema (`generateObject` is deprecated).

## Rules
- Local-first: SQLite is the source of truth; never block UI on the network.
- Money stored as integer minor units; UGX default, no decimals, formatted `UGX 87,457`.
- Shared Zod schemas and the voice parser live in `packages/shared` (no React Native or Node-only imports).
- Never put API keys in the mobile app. Never store raw audio.
- Check current library docs before using an API; don't rely on memory.
- Work one milestone at a time (section 13 of the build prompt). After each: run on the Android emulator, run tests, commit, and summarise what was built and what's open.

## Commands (fill in as the project grows)
- Mobile: `pnpm --filter mobile android`
- API: `pnpm --filter api start:dev`
- Tests: `pnpm test`
