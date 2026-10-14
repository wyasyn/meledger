# MeLedger — Build Prompt for Claude Code

You are building **MeLedger**, a voice-first personal finance tracker and advisor for Android. Users in Uganda log income and expenses mostly by speaking ("paid boda 5k and lunch 12k cash"), with the keyboard always one tap away. The app works fully offline without an account. AI features, sync and Luganda voice are a paid "Pro" tier that needs an account (payment is simulated for now).

Read this whole document before writing code. Build in the milestone order at the end. After each milestone, run the app on an Android emulator, fix errors, and commit.

---

## 1. Ground rules

- **Android only.** Do not add iOS-specific code, configs or assets. Test on an Android emulator (API 34+).
- **Expo SDK 57** (React Native 0.86, React 19.2). Scaffold with `npx create-expo-app@latest` and confirm `expo` is `^57`. Use `npx expo install` for every Expo-compatible package so versions match the SDK. Use a development build (`npx expo run:android`), not Expo Go, because native modules are required.
- **TypeScript strict** everywhere. No `any` unless commented why.
- **Local-first.** The local SQLite database is the source of truth. Never block a screen on the network.
- **Before using any library API, check its current docs** (installed `node_modules/<pkg>/README` or the package's docs site). Several libraries changed APIs recently; do not rely on memory. In particular: in the Vercel AI SDK, `generateObject` is deprecated — use `generateText` with an `output` schema.
- Keep components small, colocate styles, and put business logic in `packages/shared` or `apps/mobile/src/features/*/logic.ts`, not inside components.
- Currency is **UGX by default, no decimals**. Format with thousands separators: `UGX 87,457`. Support USD as a secondary currency (2 decimals).

## 2. Repository layout (pnpm workspace monorepo)

```
meledger/
├─ apps/
│  ├─ mobile/          # Expo app (Android)
│  └─ api/             # NestJS backend (AI, sync, subscriptions); deployed on Render/Railway/Fly.io
├─ packages/
│  └─ shared/          # Zod schemas, types, voice parser, category seeds, money utils
├─ supabase/
│  ├─ migrations/      # SQL migrations (tables, RLS policies)
│  └─ seed.sql
├─ pnpm-workspace.yaml
└─ README.md
```

`packages/shared` must be pure TypeScript with no React Native or Node-only imports, so both apps use it.

## 3. Tech stack

### Mobile (`apps/mobile`)
| Concern | Library |
| --- | --- |
| Framework | Expo SDK 57, expo-router (file-based routing, typed routes) |
| UI kit | `react-native-paper` (Material 3), custom theme (section 4) |
| Icons | `@expo/vector-icons` — `MaterialIcons` and `MaterialCommunityIcons` only |
| State | `zustand` for UI/session state; `@tanstack/react-query` for all network calls (AI, sync, subscription, auth) |
| Local DB | `expo-sqlite` + `drizzle-orm` (expo-sqlite driver) with `useLiveQuery`; migrations via drizzle-kit |
| Key-value | `react-native-mmkv` (settings, flags, Supabase session storage adapter) |
| Speech-to-text | `expo-speech-recognition` — prefer on-device recognition (`requiresOnDeviceRecognition` when the device supports it), stream interim results |
| Text-to-speech (spoken replies) | `expo-speech` |
| Charts | `victory-native` (Skia) + `@shopify/react-native-skia` |
| Animation/gestures | `react-native-reanimated`, `react-native-gesture-handler` |
| Bottom sheets | `@gorhom/bottom-sheet` |
| Forms/validation | `react-hook-form` + `zod` (schemas from `packages/shared`) |
| Dates | `date-fns` |
| Notifications | `expo-notifications` (local scheduled reminders) |
| Biometric lock | `expo-local-authentication` |
| Secure storage | `expo-secure-store` (refresh token) |
| Haptics | `expo-haptics` |
| Share intent | receive shared text (mobile money SMS) via an Android intent filter for `text/plain` (use `expo-share-intent` or a config plugin) |
| Backend client | `@supabase/supabase-js` |

### Backend (`apps/api`)
| Concern | Library |
| --- | --- |
| Framework | NestJS latest (TypeScript, Fastify or Express adapter), one module per domain: `AuthModule` (guard only), `AiModule`, `SyncModule`, `SubscriptionModule`, `InsightsModule`, `SttModule` |
| Auth | **Supabase Auth owns all sign-up, sign-in and user records.** NestJS never creates users or issues tokens. A global `SupabaseAuthGuard` verifies the `Authorization: Bearer <supabase access token>` against the project's JWKS (or `supabase.auth.getUser(token)`) and attaches `user.id` to the request. A `@Public()` decorator exempts health checks. |
| Config & validation | `@nestjs/config`; request DTOs validated with Zod schemas from `packages/shared` (via a Zod validation pipe) |
| Scheduling | `@nestjs/schedule` for the weekly insights job |
| AI | Vercel AI SDK (`ai`) + `@ai-sdk/google` (framework-agnostic, runs in NestJS services) |
| Models | Parsing: `gemini-3.5-flash-lite`. Advisor/reports: `gemini-3.6-flash`. Read both IDs from env vars `AI_PARSE_MODEL` and `AI_ADVISOR_MODEL` so they can change without a deploy. Verify the exact model ID strings against the provider docs before first use. |
| DB/Auth | Supabase (`@supabase/supabase-js`, server-side with the secret key (`sb_secret_...`) only where needed) |
| Validation | `zod` schemas from `packages/shared` |
| Rate limiting | Per-user daily quota stored in Supabase (`ai_usage` table) |
| Luganda STT | Sunbird AI speech-to-text API, proxied by `/api/stt` |

Never ship API keys in the mobile app. The app sends the user's Supabase access token; every API route verifies it and checks the user's subscription.

## 4. Design system

Use the attached inspiration screens. Translate their iOS styling into a Material 3 Android app: keep the colours, card style, spacing and hierarchy; use Material components, ripple feedback, Android status/navigation bars (edge-to-edge) and Material icons.

### Colour tokens (light theme; derive a dark theme with the same roles)
| Token | Value | Use |
| --- | --- | --- |
| primary | `#8B5CF6` (violet) | FAB, active tab, toggles, selected chips, header gradient |
| primaryContainer | `#EDE7FE` | Selected chip backgrounds, Pro badge |
| headerGradient | `#A78BFA → #8B5CF6` | Home balance header |
| background | `#F4F4F5` | Screen background |
| surface | `#FFFFFF` | Cards |
| onSurface | `#111111` | Primary text |
| onSurfaceVariant | `#71717A` | Secondary text, labels |
| outline | `#E4E4E7` | Card borders (1px) |
| income | `#2E9BF0` blue icon tile on `#E6F3FE` | Income card |
| expense | `#EF4444` red icon tile on `#FDECEC`; amounts in red `-12,000` | Expenses |
| positive | `#16A34A` on `#E7F6EC` | "+12% vs last month" pills |
| warning banner | `#F97316` (orange) with white text | "You're 30% behind schedule" on goal cards |
| insight bar | `#111111` pill with a soft violet glow, sparkle icon in violet | "Your insight is ready" |
| category palette | violet `#8B5CF6`, blue `#2E9BF0`, green `#22C55E`, orange `#F97316`, pink `#EC4899`, teal `#14B8A6`, amber `#F59E0B`, slate `#64748B` | Donut segments, progress bars, icon tiles (tile = colour at ~10% opacity, icon = full colour) |

### Shape, type, spacing
- Card radius 20, small elements radius 12, pills fully rounded. Cards: white, 1px `outline` border, very soft shadow (elevation 1).
- Font: Inter (via `expo-font`/`@expo-google-fonts/inter`). Sizes: display balance 36/600; screen title 20/600; card title 16/600; body 14/400; label 12/500.
- Large amounts: number in `onSurface`, currency code in `onSurfaceVariant` and smaller (the inspiration greys the cents; UGX has none, so grey the "UGX" prefix instead).
- Spacing scale 4/8/12/16/20/24. Screen padding 16.
- Category icon tile: 44×44 rounded square, tinted background, Material icon centred.
- Progress bars: 8px tall, rounded, tinted track. Goal progress bar has a circular thumb at the current value and a hatched segment for "expected by now".
- Budget rows: circular percentage ring on the right (ring colour = category colour).

### Navigation
Bottom bar with **Home, Report, [centre mic FAB], Plan, Settings**, matching the inspiration (labels under icons, active item in `onSurface` with filled icon, inactive in `onSurfaceVariant`). The centre FAB is a raised violet circle with a **mic** icon (not "+"):
- **Press and hold** = record voice, release = stop and parse.
- **Tap** = open the voice sheet in tap-to-talk mode.
- A small keyboard icon button sits beside the voice sheet's mic to switch to manual entry (as in the "Budget Buddy" inspiration, which places a mic and a keyboard button side by side at the bottom).

## 5. Screens

### 5.1 Home (`/(tabs)/index`)
1. **Violet gradient header**: avatar (or initials), month selector pill ("October 2026 ▾"), notification bell with red dot. Centre: "Current Balance", big amount (sum of all wallets in base currency), small pill "+UGX 78,400 than last week".
2. **Your Money** card row: Income and Expenses cards for the selected month (icon tile, label with info icon, amount).
3. **Insight bar** (black pill): Pro users see "Your insight is ready ›" when a new digest exists. Free users see "Get insights with Pro ›" which opens the paywall.
4. **Transactions** list grouped by day ("Monday, 12 October 2026 · Total UGX 295,776"), with filter chip ("For the period") and pin/history icons. Each row: category icon tile, title (note or category), sub-line with wallet chip and tag/person chips, amount right-aligned (red for expense, green for income), wallet balance after it in grey below.
5. Wallet strip (horizontal chips: Cash, MTN MoMo, Airtel Money, Bank) above transactions; tapping filters the list.

### 5.2 Voice sheet (bottom sheet, opened from the FAB)
- Live transcript in large text as the user speaks; animated waveform/pulse ring around the mic.
- On stop: show a spinner briefly, then **one confirmation card per parsed transaction** styled like the "Add New" inspiration: Account row (wallet icon, "Cash (Main wallet)", Change button), Amount (very large, editable), Category, Tag chips (removable, coloured), Date field with calendar icon, Note.
- Every field is a tappable chip; tapping opens a picker or lets the user re-speak just that field.
- Buttons: **Save all** (primary), Discard. After save: snackbar "Saved 2 entries · Undo" for 5 seconds.
- If the utterance is a question ("how much did I spend on boda this week?"), show the answer card instead (and speak it if spoken replies are on).
- If the utterance is a command ("set food budget to 600k", "remind me to pay rent on the 28th"), show a confirmation card for that action.

### 5.3 Add / edit transaction (manual, `/transaction/new`)
Same field cards as the confirmation card, with a segmented "Expense / Income / Transfer" selector top-right (as in the "Add New ▾ Expense" inspiration). Transfer shows From wallet, To wallet and Fee.

### 5.4 Report (`/(tabs)/report`)
Follow the Report inspiration exactly:
- Title "Report", month selector pill.
- Segmented control "Expenses | Income".
- "Expenses Report" card with chart-type toggle (bar icon / donut icon). **Donut**: thick rounded segments with small gaps, total in the centre ("Total Expenses / UGX 1,421,000"), tapping a segment shows a black pill tooltip with its percentage. **Bar**: daily or weekly bars (like the Budget Buddy weekly chart with Week/Month toggle).
- "All Expenses · Total UGX …" then a category card per category: icon tile, name, "31% of total", amount, green/red pill "+12% vs last month", progress bar in the category colour.
- Tapping a category opens its transaction list.

### 5.5 Plan (`/(tabs)/plan`)
Follow the My Plan inspiration:
- Header "My Plan" with black circular "+" (add goal/budget/debt/recurring via a menu) and an export/share icon.
- **Goals** section ("View All"): goal card with icon tile, name, overflow menu, "UGX 8,750,000 out of UGX 17,500,000", progress bar with thumb and hatched "expected" segment, "Your progress" and "UGX 750,000 left". If behind schedule, an **orange footer band**: "You're 30% behind schedule and off target." If on track, a green band.
- **Budgets** section ("View All"): rows with icon tile, name, "UGX 250,000 of UGX 750,000", ring with percentage.
- Further sections: **Recurring bills** (next due date), **Debts & loans** (who owes whom), **Savings groups/SACCO**.

### 5.6 Settings (`/(tabs)/settings`)
Follow the Settings inspiration: violet **MeLedger Pro** banner at the top (sparkle tile, "Pro" badge, one-line pitch, chevron) for free users; for Pro users it shows plan status. Then grouped rows (icon tile + label + trailing control):

**Preferences**: General currency (pill "UGX"), Categories ›, Wallets ›, Reminders (toggle), Voice & input ›, Language (English / Luganda beta — Luganda requires Pro).
**AI & advisor** (Pro): AI parsing (toggle; off = local parser only), Advisor tone (Gentle / Direct), Weekly digest day, Spoken replies (toggle).
**Tools & data**: Appearance › (Light / Dark / System, dynamic colour toggle), Backups & sync (toggle, Pro), Export data › (CSV, PDF), Security › (biometric lock, lock delay, hide balances), Advanced ›.
**Account**: Sign in / Account details, Subscription ›, Delete all local data, Delete account.
**About**: Help, Privacy policy, Version.

### 5.7 Paywall (`/paywall`, modal)
Follow the Subscription inspiration: close button, sparkle icon in a violet circle, "Unlock all of MeLedger", one-line subtitle, feature list with coloured Material icons:
AI voice parsing for multi-item entries · Personal finance advisor & weekly insights · Ask questions about your money · Cloud sync & backup across devices · Luganda voice input · Monthly PDF reports.
Plan options: **Yearly** (highlighted, "Best value" badge) and **Monthly** in UGX. "Subscribe now →" button.
**Payment is simulated**: if the user has no account, route to sign-up first; then show a fake checkout sheet (mobile money number field, "Pay" button, 2-second loading), call `POST /api/subscription/simulate`, which writes an active subscription row. Make the provider pluggable (`PaymentProvider` interface with `SimulatedProvider`) for a later real integration.

### 5.8 Onboarding (`/onboarding/*`, shown once)
Dark full-screen steps in the style of the "Use your voice" inspiration (black background, centred icon in a white circle, bold title, grey body, page dots, white "Continue" pill button):
1. **Welcome** — "Say it, and it's logged." Short animation of a spoken line turning into a card.
2. **Use your voice** — explains on-device listening; "Nothing you say is stored." Request microphone permission here; show "✓ Microphone enabled" after grant. If denied, continue in keyboard mode.
3. **Language & currency** — English (Luganda marked "Pro · beta"), base currency UGX, month start day (salary day).
4. **Your wallets** — tick Cash, MTN MoMo, Airtel Money, Bank, Card; enter current balances (voice or keyboard).
5. **How you earn** — salary / freelance / business / irregular; usual amount and pay day (optional).
6. **First goal** (optional) — templates: Emergency fund, Laptop, School fees, Land, Wedding.
7. **Try it** — "Say: lunch 10k cash." The real voice flow runs and saves the first transaction.
8. **Stay on track** — daily reminder time (default 20:00) and biometric lock toggle. Finish → Home.

No account is required at any step. "Sign in" is offered only as a small text link on step 1 ("Already have an account?").

## 6. Voice pipeline

```
mic → expo-speech-recognition (on-device, interim results, language en-UG/en-US)
    → transcript
    → localParse(transcript, userContext)  // packages/shared, synchronous
        → confident & single intent? → confirmation card
        → else, Pro & online?        → POST /api/parse → confirmation card
        → else                       → best-effort local result, uncertain fields highlighted
```

Luganda (Pro): record audio to a file (`expo-audio`), upload to `POST /api/stt?lang=lug` (Sunbird), then parse the returned text with `/api/parse` (the model receives a note that the text may be Luganda or mixed Luganda-English).

### 6.1 Local parser (`packages/shared/src/parser`)
Pure function `localParse(text, ctx): ParseResult` where `ctx` = wallets, categories, vocabulary, today's date. Handle:
- **Amounts**: `5k`, `5K`, `5,000`, `5000`, `1.2m`, `1.5 million`, `fifty thousand`, `two hundred k`, `shs 3000`, `UGX 3,000`, `$20` (USD).
- **Splitting**: "and", ",", "then", "plus" separate items when each part has an amount.
- **Type**: income words (got paid, received, salary, earned, sold) vs expense (default) vs transfer (sent from X to Y, withdrew, deposited, moved). Withdraw/send fee: "fee 4,400", "charged 1000".
- **Wallet**: cash, momo / mtn / mobile money, airtel, bank / card; default wallet if none.
- **Dates**: today (default), yesterday, last Friday, "on the 3rd".
- **Category**: keyword map seeded with local words — boda/taxi/fuel/uber/safeboda → Transport; matooke/rolex/lunch/supper/chapati/groceries/market → Food; yaka/umeme/power → Electricity; nwsc/water → Water; data/bundle/airtime → Airtime & Data; rent → Rent; school fees/tuition → Education; sacco/vsla/chama → Savings group; wedding/introduction/kwanjula/burial/funeral/contribution → Family & Contributions; hospital/clinic/pharmacy/medicine → Medical; etc. Then the user's **vocabulary** table overrides the seed map.
- **People**: "lent Musa 100k", "Musa paid me back 50k" → debt entries.
- **Intents**: `log`, `question`, `set_budget`, `set_goal`, `add_reminder`, `contribute_goal`, `unknown`.
- Return per-field confidence. Below 0.7 on amount or type → mark uncertain.

Write thorough unit tests (Vitest) with at least 60 utterance fixtures, including Ugandan phrasing and mixed English/Luganda words.

### 6.2 AI parse endpoint (`POST /api/parse`)
Input: `{ transcript, locale, today, wallets[{id,name,type}], categories[{id,name,kind}], recentVocabulary[] }`. Never send the full ledger.
Use `generateText` with an `output` Zod schema (`ParseResultSchema` from `packages/shared`) and model `AI_PARSE_MODEL`. System prompt must: return only items the user stated, use given IDs for wallets/categories (or `null`), interpret UGX shorthand, never invent amounts, set `intent`, and keep `note` short. Validate with Zod; on failure retry once, then return the local result.

### 6.3 Learning
When the user changes a parsed field before saving, upsert into `vocabulary` (phrase → category/wallet/person) and increment `hits`. Settings › Voice & input › Learned words lets users review and delete entries.

### 6.4 Questions
`question` intents are answered **locally** for supported query shapes (sum by category/wallet/period, top categories, balance, budget remaining, goal progress), using Drizzle queries. For Pro users, unsupported questions go to `POST /api/ask` with a compact monthly summary (category totals, budgets, goals — no transaction notes) and the advisor model.

## 7. Data model

Identical logical schema locally (Drizzle/SQLite) and in Supabase (Postgres). Every table has `id uuid`, `user_id` (nullable locally until sign-in), `created_at`, `updated_at`, `deleted_at` (soft delete), `sync_version int`. Store money as **integer minor units** (UGX = whole shillings, USD = cents) plus `currency`.

- `profile`: name, base_currency, language, month_start_day, onboarding_done, advisor_tone, reminder_time
- `wallets`: name, type (`cash|mobile_money|bank|card|savings`), provider, currency, opening_balance, color, icon, sort, archived
- `categories`: name, kind (`income|expense`), group, icon, color, parent_id, is_system, hidden
- `transactions`: type (`income|expense|transfer`), amount, currency, fx_rate, wallet_id, to_wallet_id, category_id, occurred_at, note, fee_amount, scope (`personal|business`), source (`voice|keyboard|shared_sms|receipt`), transcript, confidence
- `tags`, `transaction_tags`, `people`
- `budgets`: category_id, period (`monthly`), limit_amount, alert_at (default 80)
- `goals`: name, icon, target_amount, target_date, wallet_id, status
- `goal_contributions`: goal_id, amount, occurred_at, transaction_id
- `recurring_rules`: template (JSON), frequency, next_due_at, mode (`auto_log|remind`)
- `debts`: person_id, direction (`owed_to_me|i_owe`), principal, due_at, status; repayments link via `transactions.debt_id`
- `reminders`: text, due_at, repeat, linked_type, linked_id
- `vocabulary`: phrase, target_type (`category|wallet|person`), target_id, hits
- Server only: `subscriptions` (user_id, plan, status, current_period_end, provider), `ai_usage` (user_id, date, calls, tokens), `insights` (user_id, period, kind, body_json, created_at)

Balances, monthly summaries and net worth are **computed** from transactions, never stored.

Seed categories (with Material icon names and palette colours) from both reference sheets plus local ones:
Fixed: Rent/Mortgage, Electricity (Yaka), Water, Gas, Internet, Phone · Food: Groceries, Eating out, Coffee & snacks · Transport: Boda/Taxi, Fuel, Maintenance, Parking, Insurance, Public transport · Shopping: Clothes, Electronics, Beauty, Home goods, Gifts · Medical: Doctor, Medication, Health insurance · Fitness: Gym, Sports, Equipment, Wellness · Entertainment: Movies, Events, Hobbies, Restaurants, Parties, Leisure travel · Family & Education: Childcare, School fees, Books, Materials, Courses · Local: Airtime & Data, Mobile money fees, Family support, Contributions (weddings, burials), Savings group/SACCO, Church/Mosque giving, Business expense.
Income: Salary, Freelance/Contract, Business, Gifts received, Interest/Dividends, Refunds, Other.

## 8. Free vs Pro

| Feature | Free (no account) | Pro (account + subscription) |
| --- | --- | --- |
| Voice logging, English, local parser | ✓ | ✓ |
| AI parsing (multi-item, ambiguous, questions beyond built-in) | — | ✓ |
| Wallets, categories, budgets, goals, debts, recurring, reminders | ✓ | ✓ |
| Reports & charts, CSV export | ✓ | ✓ |
| Advisor: weekly digest, insights, "can I afford it?", goal coaching | — | ✓ |
| Monthly PDF report | — | ✓ |
| Cloud sync & backup | — | ✓ |
| Luganda voice | — | ✓ |

Implement a single `useEntitlements()` hook (Zustand + TanStack Query, cached in MMKV for offline) and a `<ProGate feature="...">` component that renders the locked state (small lock icon + "Pro" badge) and opens the paywall on tap. Never hide free features behind sign-in.

## 9. Sync (Pro)

- On first sign-in, upload all local rows (assign `user_id`).
- Outbox pattern: each local write also appends to `sync_outbox` (table, row_id, op). A background task (on app foreground, after writes debounced 5s, and on reconnect via `@react-native-community/netinfo`) pushes the outbox to `POST /api/sync/push`, then pulls changes since `last_pulled_at` from `GET /api/sync/pull`.
- Conflict rule: last write wins by `updated_at`; soft deletes win over edits.
- Supabase RLS: every table `using (user_id = auth.uid())`.

## 10. API routes (NestJS controllers in `apps/api/src`)

| Route | Purpose |
| --- | --- |
| `POST /api/parse` | AI parse (Pro) |
| `POST /api/ask` | Advisor Q&A over a compact summary (Pro) |
| `POST /api/insights/generate` | Weekly digest / monthly report (Pro); also run weekly by a `@nestjs/schedule` cron job |
| `POST /api/stt` | Luganda speech-to-text via Sunbird (Pro) |
| `POST /api/sync/push`, `GET /api/sync/pull` | Sync (Pro) |
| `GET /api/me/entitlements` | Plan + feature flags + remaining AI quota |
| `POST /api/subscription/simulate` | Simulated purchase/cancel |

All routes: pass the global `SupabaseAuthGuard`, then an `EntitlementGuard` (`@RequiresPro()` decorator) where needed, enforce daily quota (e.g. 200 parse calls, 30 ask calls), return typed errors `{ code, message }`. Log model, tokens and latency to `ai_usage`.

### Advisor prompt rules
Input is a JSON summary: month-to-date and last 3 months category totals, budgets with % used, goals with progress and schedule status, recurring bills due, income pattern, wallet balances. The advisor must: be short (max 5 bullet insights), cite the user's actual numbers in UGX, give one concrete action per insight, never recommend specific financial products or investments, avoid judgemental language, and respect the tone setting. Output schema: `{ headline, insights[{title, body, action, severity}] }`.

## 11. Notifications
Local only (`expo-notifications`): daily log reminder (skip if the user already logged today), bill due (1 day before), budget at 80% and 100%, goal milestones (25/50/75/100%), weekly digest ready (Pro). Quiet hours setting.

## 12. Privacy & security
- Never store raw audio. Luganda clips are deleted from the device and server right after transcription.
- Transcript storage is a setting (default on, for learning); turning it off clears stored transcripts.
- Biometric lock on app open and after N minutes in background; "hide balances" blurs amounts on Home.
- AI calls send summaries, not notes or names, except the transcript being parsed.

## 13. Milestones (build in this order)

1. **Scaffold** — monorepo, Expo SDK 57 app with expo-router, Paper theme, Inter font, bottom tabs with centre mic FAB (placeholder screens), NestJS app with health endpoint and the Supabase auth guard, shared package, lint/format, Vitest. *Done when* the app runs on the emulator with the themed tab bar.
2. **Local data** — Drizzle schema + migrations, seed categories, wallets CRUD, manual add/edit/delete transactions, Home screen with real data. *Done when* a user can add entries by keyboard and see balances update.
3. **Voice** — speech recognition, voice sheet, local parser with tests, confirmation cards, undo, vocabulary learning. *Done when* "paid boda 5k and lunch 12k cash" creates two correct entries offline.
4. **Report & Plan** — donut/bar charts, category breakdown with vs-last-month, budgets, goals with schedule status band, recurring, debts, savings groups.
5. **Onboarding & Settings** — all onboarding steps, full settings screens, notifications, biometric lock, CSV export.
6. **Backend & Pro** — Supabase project + migrations + RLS, Supabase Auth in the app (email OTP and Google sign-in via `@supabase/supabase-js`, session in MMKV), NestJS guard verifying those tokens, entitlements, paywall, simulated payment, `/api/parse`, `/api/ask`, insights, sync.
7. **Luganda & share-to-app** — Sunbird STT route, Luganda recording flow, share-intent for mobile money SMS text parsed by the same pipeline.
8. **Polish** — dark theme, empty states, loading skeletons, error states, accessibility labels, performance pass, EAS build profile for an Android APK.

After each milestone, summarise what was built, what was tested, and anything left open.

## 14. Environment variables

`apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`), `EXPO_PUBLIC_API_URL`
`apps/api/.env`: `PORT`, `SUPABASE_URL`, `SUPABASE_JWKS_URL` (or `SUPABASE_JWT_SECRET` on older projects), `SUPABASE_SECRET_KEY` (`sb_secret_...`), `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_PARSE_MODEL=gemini-3.5-flash-lite`, `AI_ADVISOR_MODEL=gemini-3.6-flash`, `SUNBIRD_API_KEY`, `DAILY_PARSE_QUOTA`, `DAILY_ASK_QUOTA`

Create `.env.example` files; never commit real keys.

## 15. Design references

The design inspiration images are attached alongside this prompt (Home, Report, My Plan, Settings, Add New, Subscription, goal card, category cards, income/expense cards, insight bar, donut chart, and the dark "Use your voice" onboarding and weekly bar chart from Budget Buddy). Match their layout, spacing and card styling; replace "$" with UGX formatting, replace the "+" FAB with the mic FAB, and use Material icons and Android conventions throughout.
