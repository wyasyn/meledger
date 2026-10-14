# MeLedger — Product & Architecture Plan

Oct 14, 2026 · @Yasin Walum

## Vision and principles

A personal finance app where logging a transaction takes one breath: hold the mic, say "paid boda 5k and bought lunch 12k", confirm, done. The tracker feeds an advisor that explains where money goes and what to change. Keyboard entry is always one tap away.

- **Under 5 seconds per log.** Voice is the default input; every voice result lands on an editable confirmation card, never saved blindly.
- **Local-first.** The app works fully offline. Data lives on the phone and syncs when online.
- **Built for how money moves here.** Cash, MTN MoMo, Airtel Money and bank accounts as first-class wallets; UGX shorthand ("5k", "1.2m", "shs") understood natively; Luganda input as a later phase.
- **Advisor, not a lecturer.** Insights are short, specific and tied to the user's own numbers and goals.
- **Private by default.** Raw audio is never stored; only the transcript and the parsed transaction are kept.

## Feature domains

The two reference sheets give eight domains; local money habits add nine more that most finance apps miss. Each domain below is a module in the app.

### From the reference images

| Domain | What it covers | Voice example |
| --- | --- | --- |
| Income | Salary, freelance/contract pay, side income, gifts received | "Got paid 2.5m salary" |
| Expenses | Every outflow, with category and wallet | "Lunch 12k cash" |
| Expense categories | Fixed (rent, power, water, internet, phone), Food, Transport, Shopping, Medical, Fitness, Entertainment, Family & Education | Auto-assigned from words like "boda", "Yaka", "matooke" |
| Monthly summary | Income vs expenses vs savings, per month and year | "How am I doing this month?" |
| Savings & investments | Deposits, withdrawals, running balance per pot | "Put 200k in emergency fund" |
| Financial goals | Target amount, date, progress, auto-contributions | "Save 3m for a laptop by March" |
| Notes & reminders | Free notes, bill reminders, nudges | "Remind me to pay rent on the 28th" |

### Added domains

| Domain | Why it matters | Voice example |
| --- | --- | --- |
| Wallets / accounts | Cash, MTN MoMo, Airtel Money, bank, card each hold a balance; net worth is their sum | "Sent 50k from MoMo" |
| Transfers and fees | Moving money between wallets is not spending; MoMo send and withdraw charges are a real cost to track | "Withdrew 200k from MoMo, fee 4,400" |
| Budgets | Monthly limit per category with alerts at 80% and 100% | "Set food budget to 600k" |
| Recurring bills & subscriptions | Rent, Yaka, data bundles, Netflix, school fees terms; auto-suggested from repeats | "Netflix every month 40k" |
| Debts & loans | Money lent to friends, borrowed, SACCO or bank loans, with who owes whom and repayments | "Lent Musa 100k" |
| Savings groups & SACCOs | Weekly VSLA/SACCO contributions, payouts and shares | "Paid SACCO 50k" |
| Family support & contributions | Support to relatives, wedding/introduction and burial contributions; often the biggest unplanned spend | "Contributed 100k to Brian's wedding" |
| Airtime & data | Small, frequent spends that add up | "Data 10k" |
| Side business split | Tag entries as personal or business to separate agency/freelance money | "Business: paid hosting 120k" |
| Advisor & insights | Weekly digest, anomaly alerts, "can I afford it?", goal coaching | "Can I afford a 1.5m phone this month?" |
| Reports & export | Monthly PDF, CSV export, charts by category and wallet | "Export last month" |

Cross-cutting: multi-currency (UGX base, USD for contract pay), receipt photo attached to an entry, tags and people on any entry, and full-text search.

## Voice logging flow

One hold-to-talk gesture handles four intents: log, ask, set (goal, budget, reminder) and correct. The parser always ends on a confirmation card.

1. **Capture.** Hold the mic button (home screen, widget, or lock-screen shortcut). Audio streams to on-device speech-to-text; live words appear as the user speaks.
2. **Transcribe.** On-device STT for English. If the user picked Luganda, or confidence is low, the clip goes to the cloud STT through the backend.
3. **Parse locally first.** A rule-based parser on the phone extracts amounts ("5k", "1.2m", "fifty thousand"), wallets ("MoMo", "cash"), dates ("yesterday") and known merchant/category words. Simple single entries never leave the phone.
4. **Parse with AI when needed.** Multi-item, ambiguous or question utterances go to the LLM, which returns strict JSON: intent plus a list of transactions.
5. **Confirm.** A card shows each parsed entry as editable chips: amount, category, wallet, date, note. Tap a chip to fix it by voice or keyboard. Default action is Save; a 5-second undo toast follows.
6. **Learn.** Every correction updates the user's personal dictionary ("Kikuubo" means Shopping, "Jumia" means Shopping/Food) so the local parser gets it right next time.
7. **Answer questions.** "How much on boda this week?" runs a query against local data and replies in text, with optional spoken reply.

Offline behaviour: steps 1, 3, 5 and 6 work with no network. Utterances that need AI are saved as drafts and parsed when the phone reconnects.

Inputs beyond voice: keyboard quick-add with the same chip card, receipt photo (OCR then the same parser), and "share to app" for a mobile money SMS so the text is parsed without SMS permissions (see Architecture).

## On-device vs backend AI: yes, you need a backend, but a thin one

Recommendation: hybrid. Speech-to-text and simple parsing run on the phone; the LLM parser and advisor run behind your own small backend. Phone-only AI is not viable for your market today.

| Job | On the phone | Through the backend | Decision |
| --- | --- | --- | --- |
| Speech-to-text (English) | iOS 26 [SpeechAnalyzer](https://www.developersdigest.tech/blog/apple-speechanalyzer-vs-whisper-benchmark) is fast, accurate and fully offline; Android has on-device recognition via [ML Kit GenAI speech](https://developer.android.com/ai/gemini-nano) and the system recognizer | Cloud STT costs money and adds latency | **Phone** |
| Speech-to-text (Luganda, Runyankole, etc.) | No reliable on-device model | [Sunbird AI](https://docs.sunbird.ai/api-reference/speech/speech-to-text.md) offers STT for Luganda, Lugbara, Runyankole and English | **Backend** (phase 2) |
| Simple parsing ("boda 5k") | Rule parser plus personal dictionary, instant and free | Not needed | **Phone** |
| Complex parsing and questions | Apple Foundation Models and Gemini Nano exist, but only on recent flagships; Gemini Nano's Prompt API [performs best on Pixel 10](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences), so most mid-range Android phones in Uganda won't have it | A hosted LLM works on every phone | **Backend**, with on-device LLM as an optional fast path when available |
| Advisor insights and monthly report | Too much context for small models | Hosted LLM over a compact monthly summary | **Backend** |
| Sync, backup, multi-device | Not possible | Auth plus database | **Backend** |

Why a backend instead of calling the AI provider straight from the app: API keys can't be shipped safely in a mobile binary; you need per-user rate limits and cost caps; you can swap models without an app update; and you control what data leaves the phone (send a summary, not the full ledger).

SMS auto-import is not an option on Google Play: READ\_SMS is limited to default SMS apps, and finance apps that asked for it [have been refused](https://dev.to/zeta_byte/ive-been-working-on-a-personal-finance-app-called-finvantage-and-i-recently-hit-a-roadblock-4mjh) ([policy](https://support.google.com/googleplay/android-developer/answer/9047303)). Use "share to app" for a MoMo SMS and paste-to-parse instead.

## Architecture and tech stack

Android-only Expo app with a local SQLite database as the source of truth, syncing to Supabase; a NestJS API is the only thing that talks to Gemini and speech providers; Supabase Auth owns all users and sign-in. Decided 14 Oct 2026.

&#91;embedded content: system architecture · phone, backend, providers\]

Most entries go input → speech-to-text → local parser → card → database without touching the network; the gateway is the only path to paid AI.

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile app | [Expo SDK 57](https://expo.dev/changelog/sdk-57) (React Native 0.86, React 19.2), TypeScript, expo-router, Android only | Latest SDK; file-based routing |
| UI | React Native Paper (Material 3) themed to the MeLedger purple, Material icons via @expo/vector-icons | Native Android look with the inspiration's styling |
| State | Zustand (UI and session), TanStack Query (server calls: AI, sync, subscription) | Small stores; caching and retries for network work |
| Local database | expo-sqlite + Drizzle ORM, live queries | Offline-first; typed schema and migrations |
| Fast key-value | react-native-mmkv | Settings, flags, Supabase session |
| On-device speech | expo-speech-recognition, on-device mode where available | Free, private, offline |
| Charts | victory-native (Skia) | Rounded donut and bar charts like the inspiration |
| Backend | NestJS on Render, Railway or Fly.io; a global guard verifies Supabase access tokens | One TypeScript stack end to end |
| Data and auth | Supabase: Postgres, Auth, Row Level Security, Storage | Managed; per-user isolation |
| AI | Vercel AI SDK + @ai-sdk/google: Gemini 3.5 Flash-Lite for parsing, Gemini 3.6 Flash for advisor | Cheapest capable model for the frequent job; see AI models below |
| Luganda speech | Sunbird AI STT via the NestJS API | Pro feature |
| Subscription | Simulated checkout writing to a `subscriptions` table | Swap for real billing later |

## Data model

Twelve core tables, identical on the phone (Drift) and in Supabase (Postgres). Every row carries `id` (UUID), `user_id`, `created_at`, `updated_at`, `deleted_at` for soft delete and sync.

| Entity | Key fields |
| --- | --- |
| users / profile | name, base\_currency (UGX), language, locale, month\_start\_day, onboarding\_done |
| wallets | name, type (cash, mobile\_money, bank, card, savings), provider (MTN, Airtel, bank name), currency, opening\_balance, archived |
| categories | name, kind (income, expense), group (Fixed, Food, Transport…), icon, colour, parent\_id |
| transactions | type (income, expense, transfer), amount, currency, fx\_rate, wallet\_id, to\_wallet\_id, category\_id, date, note, fee\_amount, scope (personal, business), source (voice, keyboard, receipt, shared\_sms), transcript, confidence |
| transaction\_tags / people | tag or person links (who was paid, who was lent to) |
| budgets | category\_id, period (monthly), limit, alert\_thresholds |
| goals | name, target\_amount, target\_date, linked\_wallet\_id, status |
| goal\_contributions | goal\_id, amount, date, transaction\_id |
| recurring\_rules | template transaction, frequency, next\_due, auto\_log or remind |
| debts | person, direction (owed\_to\_me, i\_owe), principal, due\_date, status; repayments link to transactions |
| reminders\_notes | text, due\_at, repeat, linked entity |
| vocabulary | phrase, maps\_to (category, wallet, person), hits; the parser's learned dictionary |

Balances, monthly summaries and net worth are computed from transactions, not stored, so they can never drift out of sync.

## Onboarding

Eight short screens, under two minutes, ending with the user's first real voice log. Everything after step 4 can be skipped and finished later from a home-screen checklist.

1. **Welcome.** One line on the promise ("Say it, and it's logged") and a 5-second animation of a voice log becoming a card.
2. **Account.** Continue with phone number (OTP), Google or Apple, or "Use without an account" (local only, upgrade later).
3. **Language and currency.** English or Luganda (Luganda marked beta), base currency (UGX default), date format, which day the month starts (salary day).
4. **Microphone permission.** Explain why before the system prompt; show that audio is not stored. If denied, the app runs keyboard-first with a banner to enable later.
5. **Wallets.** Tick what you use: Cash, MTN MoMo, Airtel Money, bank, card. Enter current balances, by voice or keyboard ("MoMo has 230k").
6. **Income.** How you're paid: salary, freelance, business, irregular; usual amount and pay day. Feeds forecasts and the advisor.
7. **First goal and budgets (optional).** Pick a goal template (emergency fund, laptop, school fees, land, wedding) and accept suggested budgets for the top three categories.
8. **First voice log.** Guided practice: "Try saying: lunch 10k cash". The confirmation card appears and the user saves their first entry.

Finish with reminder preference ("Nudge me at 8pm if I haven't logged today") and the biometric lock toggle.

## Settings

Ten groups on one Settings screen, each opening its own page. Voice and privacy sit near the top because they define the product.

| Group | Settings |
| --- | --- |
| Profile & account | Name, photo, phone/email, linked sign-in methods, change plan, delete account |
| Voice & input | Input language (English, Luganda beta), default input (voice or keyboard), hold-to-talk vs tap-to-start, auto-save after N seconds vs always confirm, spoken replies on/off, haptics, lock-screen and home-widget shortcuts, manage learned words (vocabulary) |
| AI & advisor | AI parsing on/off (local-only mode), use on-device AI when available, advisor tone (gentle / direct), weekly digest day, what data the advisor may use, clear AI history |
| Money preferences | Base currency, secondary currencies and rates, number format (5,000 vs 5k), month start day, default wallet, default category for unknowns, personal/business split on/off |
| Wallets | Add, edit, reorder, archive; opening balances; transfer fee presets for MoMo/Airtel |
| Categories & tags | Add, rename, merge, hide, set icons and colours, manage people list |
| Budgets, goals & recurring | Edit budgets and alert thresholds, goals, recurring rules |
| Notifications | Daily log reminder time, bill due alerts, budget alerts, goal milestones, weekly digest, quiet hours |
| Security & privacy | Biometric/PIN lock, lock delay, hide balances on home screen, store transcripts on/off, export data (CSV, PDF), backup and sync status, delete all data |
| Appearance & about | Theme (light, dark, system), text size, home screen widgets, help, feedback, privacy policy, version |

## MVP scope and roadmap

Ship the voice logging loop first; the advisor only becomes useful once a user has a few weeks of data.

| Phase | Scope | Done when |
| --- | --- | --- |
| 1. MVP | Onboarding, wallets, income/expense/transfer, categories from both reference sheets, English voice logging with local parser + AI parser, confirmation card, keyboard quick-add, monthly summary, basic charts, daily reminder, biometric lock, local-only mode | A user logs a day's spending by voice in under a minute, offline included |
| 2. Plan | Budgets, goals with contributions, recurring bills, debts and loans, savings groups/SACCO, notes and reminders by voice, Supabase sync and backup | A user can set and track a month's plan across two devices |
| 3. Advise | Weekly digest, anomaly alerts, "can I afford it?", goal coaching, voice questions over data, monthly PDF report | Advisor tips reference the user's own numbers and goals |
| 4. Local | Luganda voice input via Sunbird, share-to-app MoMo SMS parsing, receipt OCR, personal/business split, home and lock-screen widgets | A Luganda speaker can log without switching languages |

## Open decisions and next step

Once these are settled, send the design inspiration and we write the build prompt for Claude Code with this doc as its context.

- [x] App name
- [x] Confirm Flutter + Riverpod (or keep GetX, which you know from previous work)
- [x] Supabase + FastAPI gateway, or Firebase to match the savings-goals app you planned; and whether that app folds into this one as the Goals module
- [x] Free vs paid: which features (advisor, sync, Luganda) sit behind a subscription
- [x] Account required at launch, or local-only first
- [x] iOS at launch or Android first (Android is most of the Ugandan market)
- [x] Design inspiration: screens, colours, type, mood

### Decisions (14 Oct 2026)

- **Name:** MeLedger.
- **Platform:** Android only.
- **Free tier (local, no account):** voice and keyboard logging with the on-device parser, wallets, categories, budgets, goals, debts, recurring, reports, reminders, export.
- **Pro (account required, payment simulated for now):** AI parsing, advisor and insights, cloud sync and backup, Luganda voice.

### AI models

| Job | Model | Price per 1M tokens (in / out) |
| --- | --- | --- |
| Voice parsing, categorising, questions | Gemini 3.5 Flash-Lite | [$0.30 / $2.50](https://www.eesel.ai/blog/gemini-3-5-flash-lite-pricing) |
| Weekly digest, monthly report, "can I afford it?" | Gemini 3.6 Flash | [$1.50 / $7.50](https://www.eesel.ai/blog/gemini-3-5-flash-lite-pricing) |

No finance-specialised model is worth it here: parsing is extraction, and advice quality comes from feeding the model the user's real numbers. Call both through the AI SDK so the model is one env var to change.

### Sources

- [Apple SpeechAnalyzer vs Whisper benchmark](https://www.developersdigest.tech/blog/apple-speechanalyzer-vs-whisper-benchmark)
- [Callstack: on-device transcription with SpeechAnalyzer](https://www.callstack.com/blog/on-device-speech-transcription-with-apple-speechanalyzer)
- [Android: Gemini Nano and ML Kit GenAI](https://developer.android.com/ai/gemini-nano)
- [Android blog: ML Kit Prompt API](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences)
- [Sunbird AI speech-to-text API](https://docs.sunbird.ai/api-reference/speech/speech-to-text.md)
- [Google Play: SMS and Call Log permissions](https://support.google.com/googleplay/android-developer/answer/9047303)
- [Developer account of a finance app refused SMS access](https://dev.to/zeta_byte/ive-been-working-on-a-personal-finance-app-called-finvantage-and-i-recently-hit-a-roadblock-4mjh)
