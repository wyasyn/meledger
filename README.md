# MeLedger

Voice-first personal finance tracker and advisor for Android (Uganda first). See `docs/BUILD_PROMPT.md` for the full spec.

## Layout

- `apps/mobile`: Expo SDK 57 app (Android only)
- `apps/api`: NestJS API (AI, sync, subscriptions)
- `packages/shared`: Zod schemas, types, money utils, voice parser
- `supabase/`: SQL migrations and seed

## Getting started

```sh
pnpm install
pnpm build:shared
cp apps/api/.env.example apps/api/.env      # then fill in values
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter api start:dev
pnpm --filter mobile android                # dev build on a running emulator
```

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```
