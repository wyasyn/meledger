# MeLedger

Voice-first personal finance tracker and advisor for Android (Uganda first). Users log money mostly by speaking; keyboard is always available. Works fully offline without an account; AI parsing, advisor, sync and Luganda voice are Pro (account + simulated payment for now).

## Read first

- Full spec and milestones: `docs/BUILD_PROMPT.md` — read it before starting any milestone.
- Design inspiration images: `docs/design/`: inspiration for layout, cards, spacing and hierarchy, adapted to Material 3 on Android. They are not the colour source: always use the MeLedger tokens (build prompt section 4, `apps/mobile/src/theme/tokens.ts`), even where a screenshot shows other colours. The brand primary is blue `#0067EE`; the mic button is near-black (`onSurface`) by design.
- Reference domain sheets (income, expenses, categories, goals): `docs/references/`.

## Stack (do not change without asking)

- Monorepo (pnpm workspaces): `apps/mobile`, `apps/api`, `packages/shared`, `supabase/`.
- Android application ID: `com.yasinwalum.meledger`.
- Mobile: Expo SDK 57 (React Native 0.86), TypeScript strict, expo-router, react-native-paper (MD3), Material icons only, Zustand, TanStack Query, expo-sqlite + Drizzle, MMKV, expo-speech-recognition. **Android only.**
- Backend: **NestJS** (`apps/api`). Supabase Postgres with RLS.
- **Auth: Supabase Auth owns all users, sign-up and sign-in.** The app signs in with `@supabase/supabase-js`; NestJS only verifies the Supabase access token with a global guard. Never build a users table or token issuing in NestJS.
- AI: Vercel AI SDK + `@ai-sdk/google`. Parsing `gemini-3.5-flash-lite`, advisor `gemini-3.6-flash`, both from env vars. Use `generateText` with an `output` schema (`generateObject` is deprecated).

## Rules

- **Never make assumptions.** If the spec, design images or code don't answer a question (naming, IDs, UX behaviour, library choice, scope), ask the user before building. List anything you decided yourself in the milestone summary.
- **Permissions only during onboarding.** Microphone, notifications and biometrics are requested in the onboarding steps (build prompt section 5.8), never at app launch or anywhere else. If the user denies one, the feature falls back (e.g. keyboard mode). Using that feature later shows a short explanation sheet with an "Open settings" button (Android app settings). Never show a system permission prompt outside onboarding.
- Local-first: SQLite is the source of truth; never block UI on the network.
- Money stored as integer minor units; UGX default, no decimals, formatted `UGX 87,457`.
- Shared Zod schemas and the voice parser live in `packages/shared` (no React Native or Node-only imports).
- Never put API keys in the mobile app. Never store raw audio.
- Supabase keys: the app uses the publishable key (`sb_publishable_...`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); the API uses the secret key (`sb_secret_...`, `SUPABASE_SECRET_KEY`). Never use the legacy `anon` / `service_role` keys (deprecated by end of 2026).
- **Always use the latest recommended approach, verified in current docs.** Before using any library, service or API (Expo, React Native, Supabase, NestJS, AI SDK, etc.), check its current official docs and changelog; never rely on memory. This applies to config, env var names and keys too, not just code. If `docs/BUILD_PROMPT.md` or existing code uses an approach the docs now mark as legacy or deprecated, don't copy it: tell the user and use the current one (e.g. Supabase publishable/secret keys instead of `anon`/`service_role`).
- Work one milestone at a time (section 13 of the build prompt). After each: run on the Android emulator, run tests, commit, and summarise what was built and what's open.

## Expo notes (from the Expo template's AGENTS.md)

- Expo ships breaking changes every SDK release. Before touching an Expo or React Native API, fetch the versioned docs for the installed major (`https://docs.expo.dev/versions/v57.0.0/`) or start from `https://docs.expo.dev/llms.txt`. Never answer from memory.
- Always add Expo-compatible packages with `npx expo install <pkg>` (run inside `apps/mobile`); `npx expo install --fix` and `npx expo-doctor` diagnose version problems.
- Routes live in `apps/mobile/src/app/` (every file is a screen, `_layout.tsx` defines navigators). Keep components, hooks and logic outside `src/app/`. Import `Link`, `router`, `useLocalSearchParams` from `expo-router`.
- `apps/mobile/android/` is generated (Continuous Native Generation) and gitignored. Never edit it by hand; configure native behaviour in `app.config.ts` and config plugins.
- Native modules need a development build (`pnpm --filter mobile android`), not Expo Go.
- Prefer Expo modules over third-party libraries, and check available skills before adding dependencies.

## Commands

- Install: `pnpm install` then `pnpm build:shared` (the apps consume `packages/shared` from its `dist`)
- Mobile (dev build on a running emulator): `pnpm --filter mobile android`; Metro only: `pnpm --filter mobile start`
- API: `pnpm --filter api start:dev` (needs `apps/api/.env`, see `.env.example`)
- Tests: `pnpm test` (Vitest); API e2e: `pnpm --filter api test:e2e`
- Lint / types / format: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`
- Emulator AVD: `Pixel_10_Pro_XL`
