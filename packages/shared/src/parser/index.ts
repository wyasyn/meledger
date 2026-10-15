import { DEFAULT_CURRENCY, toMinor, type CurrencyCode } from '../money';
import type { TransactionType } from '../schemas';
import { readDate } from './dates';
import {
  DEPOSIT_WORDS,
  EXPENSE_WORDS,
  FALLBACK_INCOME_CATEGORY,
  INCOME_PHRASES,
  INCOME_WORDS,
  KEYWORDS,
  MOBILE_MONEY_FEES_CATEGORY,
  STOP_WORDS,
  TRANSFER_WORDS,
  WALLET_WORDS,
  WEAK_INCOME_WORDS,
  WITHDRAW_WORDS,
} from './lexicon';
import { SEPARATORS, isNumberAnd, readAmount, tokenize, type AmountMatch } from './tokens';
import {
  PARSE_FIELDS,
  UNCERTAIN_BELOW,
  type DebtKind,
  type ParseContext,
  type ParseContextWallet,
  type ParsedCommand,
  type ParsedItem,
  type ParsedQuestion,
  type ParseIntent,
  type ParseResult,
  type QuestionMetric,
  type QuestionPeriod,
} from './types';

export * from './types';
export { addDays } from './dates';
export { tokenize } from './tokens';

/** A token index range the parser has claimed, so later passes skip it. */
type Claimed = Set<number>;

const CONSUMED = '\u0000';

/** Tokens with claimed positions blanked out, so amounts and phrases never span them. */
const visible = (tokens: readonly string[], claimed: Claimed) =>
  tokens.map((t, i) => (claimed.has(i) ? CONSUMED : t));

/** Index of the first occurrence of a word sequence among unclaimed tokens, or -1. */
function findPhrase(
  tokens: readonly string[],
  words: readonly string[],
  claimed?: Claimed,
): number {
  outer: for (let i = 0; i + words.length <= tokens.length; i += 1) {
    for (let k = 0; k < words.length; k += 1) {
      if (tokens[i + k] !== words[k] || claimed?.has(i + k)) continue outer;
    }
    return i;
  }
  return -1;
}

const has = (tokens: readonly string[], words: readonly string[]) =>
  tokens.some((t) => words.includes(t));

const claimRange = (claimed: Claimed, start: number, length: number) => {
  for (let k = start; k < start + length; k += 1) claimed.add(k);
};

const words = (phrase: string) => tokenize(phrase).filter((t) => t !== ',');

// ---------------------------------------------------------------------------------------------
// Amounts

interface Amounts {
  main: AmountMatch | null;
  /** True when the main amount is only a small bare number ("2 sodas"), likely a quantity. */
  weak: boolean;
  fee: AmountMatch | null;
}

const FEE_WORDS = ['fee', 'charge', 'charged', 'charges'];

function isWeak(m: AmountMatch): boolean {
  return !m.marked && m.currency === null && m.value < 100;
}

/** Finds a fee ("fee 4,400", "charged 1000", "1000 fee", "fee of 2k") and claims its tokens. */
function readFee(tokens: readonly string[], claimed: Claimed): AmountMatch | null {
  const view = visible(tokens, claimed);
  for (let i = 0; i < view.length; i += 1) {
    if (!FEE_WORDS.includes(view[i]!)) continue;
    let j = i + 1;
    while (view[j] === 'of' || view[j] === 'was' || view[j] === 'is' || view[j] === 'me') j += 1;
    const after = readAmount(view, j);
    if (after) {
      claimRange(claimed, i, after.end - i);
      return after;
    }
    // Amount right before the fee word.
    for (let s = Math.max(0, i - 4); s < i; s += 1) {
      const before = readAmount(view, s);
      if (before && before.end === i) {
        claimRange(claimed, s, i - s + 1);
        return before;
      }
    }
  }
  return null;
}

function readAmounts(tokens: readonly string[], claimed: Claimed): Amounts {
  const fee = readFee(tokens, claimed);
  const view = visible(tokens, claimed);
  const found: AmountMatch[] = [];
  for (let i = 0; i < view.length; i += 1) {
    const m = readAmount(view, i);
    if (m) {
      found.push(m);
      i = m.end - 1;
    }
  }
  const strong = found.filter((m) => !isWeak(m));
  const pool = strong.length > 0 ? strong : found;
  const main = pool.reduce<AmountMatch | null>(
    (best, m) => (!best || m.value > best.value ? m : best),
    null,
  );
  if (main) claimRange(claimed, main.start, main.end - main.start);
  return { main, weak: main !== null && strong.length === 0, fee };
}

/** True when the tokens hold an amount of their own (not just a fee, date or quantity). */
function hasMainAmount(tokens: readonly string[], today: string, allowWeak = false): boolean {
  const claimed: Claimed = new Set(readDate(tokens, today)?.indexes ?? []);
  const { main, weak } = readAmounts(tokens, claimed);
  return main !== null && (allowWeak || !weak);
}

// ---------------------------------------------------------------------------------------------
// Wallets

interface WalletMention {
  walletId: string;
  index: number;
  length: number;
}

const lower = (s: string | null) => (s ?? '').toLowerCase();

function walletForWord(
  entry: (typeof WALLET_WORDS)[number],
  wallets: readonly ParseContextWallet[],
) {
  if (entry.provider) {
    const p = entry.provider;
    const byProvider = wallets.find(
      (w) => lower(w.provider).includes(p) || words(w.name).includes(p),
    );
    if (byProvider) return byProvider;
  }
  return entry.type ? wallets.find((w) => w.type === entry.type) : undefined;
}

function findWallets(
  tokens: readonly string[],
  claimed: Claimed,
  ctx: ParseContext,
): WalletMention[] {
  const mentions: WalletMention[] = [];
  const take = (phrase: readonly string[], walletId: string) => {
    let i = findPhrase(tokens, phrase, claimed);
    while (i >= 0) {
      claimRange(claimed, i, phrase.length);
      mentions.push({ walletId, index: i, length: phrase.length });
      i = findPhrase(tokens, phrase, claimed);
    }
  };

  const vocab = ctx.vocabulary
    .filter((v) => v.targetType === 'wallet' && ctx.wallets.some((w) => w.id === v.targetId))
    .map((v) => ({ phrase: words(v.phrase), walletId: v.targetId }));
  const named = ctx.wallets.map((w) => ({ phrase: words(w.name), walletId: w.id }));
  for (const { phrase, walletId } of [...vocab, ...named].sort(
    (a, b) => b.phrase.length - a.phrase.length,
  )) {
    if (phrase.length > 0) take(phrase, walletId);
  }
  for (const entry of WALLET_WORDS) {
    const wallet = walletForWord(entry, ctx.wallets);
    if (wallet) take(entry.words, wallet.id);
  }
  return mentions.sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------------------------
// Categories

interface CategoryMatch {
  id: string;
  confidence: number;
  phrase: string;
}

function categoryByName(ctx: ParseContext, name: string, kind: 'income' | 'expense') {
  const n = name.toLowerCase();
  return ctx.categories.find((c) => c.kind === kind && c.name.toLowerCase() === n);
}

function findCategory(
  tokens: readonly string[],
  claimed: Claimed,
  ctx: ParseContext,
  kind: 'income' | 'expense',
): CategoryMatch | null {
  type Candidate = { words: readonly string[]; id: string; confidence: number };
  const candidates: Candidate[] = [];
  for (const v of ctx.vocabulary) {
    const category = ctx.categories.find((c) => c.id === v.targetId);
    if (v.targetType === 'category' && category?.kind === kind) {
      candidates.push({ words: words(v.phrase), id: category.id, confidence: 1 });
    }
  }
  for (const k of KEYWORDS[kind]) {
    const category = categoryByName(ctx, k.categoryName, kind);
    if (category) candidates.push({ words: k.words, id: category.id, confidence: 0.9 });
  }
  for (const c of ctx.categories) {
    if (c.kind === kind) candidates.push({ words: words(c.name), id: c.id, confidence: 0.9 });
  }

  let best: (Candidate & { index: number }) | null = null;
  for (const c of candidates) {
    if (c.words.length === 0) continue;
    const index = findPhrase(tokens, c.words, claimed);
    if (index < 0) continue;
    const better =
      !best ||
      c.confidence > best.confidence ||
      (c.confidence === best.confidence &&
        (c.words.length > best.words.length ||
          (c.words.length === best.words.length && index < best.index)));
    if (better) best = { ...c, index };
  }
  return best ? { id: best.id, confidence: best.confidence, phrase: best.words.join(' ') } : null;
}

// ---------------------------------------------------------------------------------------------
// Type, debts and people

interface TypeCue {
  type: TransactionType;
  confidence: number;
  transferKind?: 'withdraw' | 'deposit' | 'move';
  debt?: DebtKind;
  person?: string;
}

const NOT_A_NAME = new Set([
  ...STOP_WORDS,
  ...EXPENSE_WORDS,
  ...INCOME_WORDS,
  'money',
  'cash',
  'loan',
  'him',
  'her',
  'them',
  'friend',
]);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The first token from `start` that could be a name (skipping amounts and filler). */
function nameAt(tokens: readonly string[], start: number, step: 1 | -1): number {
  for (let i = start; i >= 0 && i < tokens.length && Math.abs(i - start) < 4; i += step) {
    const t = tokens[i]!;
    if (/^[a-z]+$/.test(t) && !NOT_A_NAME.has(t) && readAmount(tokens, i) === null) return i;
  }
  return -1;
}

function readDebt(tokens: readonly string[], claimed: Claimed): TypeCue | null {
  const cue = (
    debt: DebtKind,
    verbAt: number,
    verbLen: number,
    nameIndex: number,
  ): TypeCue | null => {
    if (nameIndex < 0) return null;
    claimRange(claimed, verbAt, verbLen);
    claimed.add(nameIndex);
    const type: TransactionType = debt === 'lend' || debt === 'repay' ? 'expense' : 'income';
    return { type, confidence: 0.9, debt, person: capitalize(tokens[nameIndex]!) };
  };

  // "Musa paid me back 50k", "Musa returned 20k"
  for (const phrase of [
    ['paid', 'me', 'back'],
    ['paid', 'back'],
    ['returned'],
    ['refunded', 'me'],
  ]) {
    const i = findPhrase(tokens, phrase, claimed);
    if (i > 0 && (phrase[1] === 'me' || phrase[0] === 'returned' || tokens[i - 1] !== 'i')) {
      const found = cue('repaid_to_me', i, phrase.length, nameAt(tokens, i - 1, -1));
      if (found) return found;
    }
  }
  // "paid back Musa 20k", "repaid Musa", "I paid Musa back"
  const repaid = findPhrase(tokens, ['repaid'], claimed);
  if (repaid >= 0) return cue('repay', repaid, 1, nameAt(tokens, repaid + 1, 1));
  const paidBack = findPhrase(tokens, ['paid', 'back'], claimed);
  if (paidBack >= 0) return cue('repay', paidBack, 2, nameAt(tokens, paidBack + 2, 1));
  const back = findPhrase(tokens, ['back'], claimed);
  if (back >= 2 && tokens[back - 2] === 'paid') return cue('repay', back - 2, 1, back - 1);

  // "lent Musa 100k", "gave Musa a loan of 50k"
  for (const verb of ['lent', 'lend', 'loaned']) {
    const i = findPhrase(tokens, [verb], claimed);
    if (i >= 0) return cue('lend', i, 1, nameAt(tokens, i + 1, 1));
  }
  // "borrowed 50k from Musa", "Musa lent me 50k" handled above as lend unless "me" follows.
  for (const verb of ['borrowed', 'borrow']) {
    const i = findPhrase(tokens, [verb], claimed);
    if (i >= 0) {
      const from = tokens.indexOf('from', i);
      return cue('borrow', i, 1, from >= 0 ? nameAt(tokens, from + 1, 1) : -1);
    }
  }
  return null;
}

function readType(
  tokens: readonly string[],
  claimed: Claimed,
  wallets: readonly WalletMention[],
  hasIncomeKeyword: boolean,
): TypeCue | null {
  const claimWord = (list: readonly string[]) => {
    tokens.forEach((t, i) => {
      if (list.includes(t) && !claimed.has(i)) claimed.add(i);
    });
  };

  if (has(tokens, WITHDRAW_WORDS)) {
    claimWord(TRANSFER_WORDS);
    return { type: 'transfer', confidence: 0.95, transferKind: 'withdraw' };
  }
  if (has(tokens, DEPOSIT_WORDS)) {
    claimWord(TRANSFER_WORDS);
    return { type: 'transfer', confidence: 0.95, transferKind: 'deposit' };
  }
  const moveVerb = has(tokens, TRANSFER_WORDS) || has(tokens, ['sent', 'send']);
  if (moveVerb && wallets.length >= 2) {
    claimWord([...TRANSFER_WORDS, 'sent', 'send']);
    return { type: 'transfer', confidence: 0.95, transferKind: 'move' };
  }
  if (has(tokens, TRANSFER_WORDS)) {
    claimWord(TRANSFER_WORDS);
    return { type: 'transfer', confidence: 0.75, transferKind: 'move' };
  }

  for (const phrase of INCOME_PHRASES) {
    const i = findPhrase(tokens, phrase, claimed);
    if (i >= 0) {
      claimRange(claimed, i, phrase.length);
      return { type: 'income', confidence: 0.95 };
    }
  }
  if (has(tokens, INCOME_WORDS)) {
    claimWord(INCOME_WORDS);
    return { type: 'income', confidence: 0.95 };
  }
  if (has(tokens, EXPENSE_WORDS)) {
    claimWord(EXPENSE_WORDS);
    return { type: 'expense', confidence: 0.95 };
  }
  if (has(tokens, WEAK_INCOME_WORDS) && (hasIncomeKeyword || tokens.includes('from'))) {
    claimWord(WEAK_INCOME_WORDS);
    return { type: 'income', confidence: 0.85 };
  }
  if (hasIncomeKeyword) return { type: 'income', confidence: 0.85 };
  return null;
}

// ---------------------------------------------------------------------------------------------
// Items

interface Draft {
  item: ParsedItem;
  explicitType: boolean;
  explicitWallet: boolean;
  explicitDate: boolean;
}

const roundConfidence = (n: number) => Math.round(n * 100) / 100;

function finish(item: ParsedItem): ParsedItem {
  const c = item.confidence;
  const confidence = {
    amount: roundConfidence(c.amount),
    type: roundConfidence(c.type),
    wallet: roundConfidence(c.wallet),
    category: roundConfidence(c.category),
    date: roundConfidence(c.date),
  };
  const uncertain = PARSE_FIELDS.filter((f) => confidence[f] < UNCERTAIN_BELOW);
  return { ...item, confidence, uncertain };
}

function defaultWallet(ctx: ParseContext): string | null {
  return ctx.defaultWalletId ?? ctx.wallets[0]?.id ?? null;
}

function noteFrom(tokens: readonly string[], claimed: Claimed): string {
  const kept = tokens.filter(
    (t, i) =>
      !claimed.has(i) && !STOP_WORDS.has(t) && /^[a-z]/.test(t) && readAmount(tokens, i) === null,
  );
  const note = kept.join(' ').slice(0, 60).trim();
  return note ? capitalize(note) : '';
}

function analyzeSegment(tokens: readonly string[], ctx: ParseContext): Draft[] {
  const claimed: Claimed = new Set();
  const base: CurrencyCode = ctx.baseCurrency ?? DEFAULT_CURRENCY;

  const date = readDate(tokens, ctx.today);
  date?.indexes.forEach((i) => claimed.add(i));
  const amounts = readAmounts(tokens, claimed);

  const debt = readDebt(tokens, claimed);
  const incomeKeyword = findCategory(tokens, claimed, ctx, 'income');
  const preCategory = findCategory(tokens, claimed, ctx, 'expense');
  // Category phrases ("savings group", "mobile money fee") outrank wallet words inside them.
  const categoryClaim: Claimed = new Set();
  if (preCategory) {
    const i = findPhrase(tokens, preCategory.phrase.split(' '), claimed);
    if (i >= 0) claimRange(categoryClaim, i, preCategory.phrase.split(' ').length);
  }
  const wallets = findWallets(tokens, new Set([...claimed, ...categoryClaim]), ctx);
  wallets.forEach((w) => claimRange(claimed, w.index, w.length));

  const typeCue =
    debt ??
    readType(tokens, claimed, wallets, incomeKeyword !== null && !has(tokens, EXPENSE_WORDS));
  const type: TransactionType = typeCue?.type ?? 'expense';

  // Category
  let category: CategoryMatch | null = null;
  let categoryConfidence = 1;
  if (type !== 'transfer' && !typeCue?.debt) {
    // Income words found before the verb claimed them ("sold" is both verb and Business).
    category = type === 'income' ? incomeKeyword : findCategory(tokens, claimed, ctx, 'expense');
    if (!category && type === 'income') {
      const other = categoryByName(ctx, FALLBACK_INCOME_CATEGORY, 'income');
      if (other) category = { id: other.id, confidence: 0.6, phrase: '' };
    }
    categoryConfidence = category?.confidence ?? 0;
  }

  // Type confidence: default expense is surer when an expense category was recognised.
  const typeConfidence =
    typeCue?.confidence ?? (category && category.confidence >= 0.9 ? 0.8 : 0.6);

  // Wallets
  let walletId: string | null = null;
  let toWalletId: string | null = null;
  let walletConfidence: number;
  if (type === 'transfer') {
    const tagged = (words: readonly string[]) =>
      wallets.find(
        (w) =>
          words.includes(tokens[w.index - 1] ?? '') || words.includes(tokens[w.index - 2] ?? ''),
      );
    const from = tagged(['from', 'off']);
    const to = tagged(['to', 'into', 'onto', 'on']);
    const untagged = wallets.filter((w) => w !== from && w !== to);
    const cash = ctx.wallets.find((w) => w.type === 'cash')?.id ?? null;
    if (typeCue?.transferKind === 'withdraw') {
      walletId =
        from?.walletId ??
        untagged[0]?.walletId ??
        ctx.wallets.find((w) => w.type === 'mobile_money')?.id ??
        null;
      toWalletId = to?.walletId ?? cash;
    } else if (typeCue?.transferKind === 'deposit') {
      toWalletId =
        to?.walletId ??
        untagged[0]?.walletId ??
        ctx.wallets.find((w) => w.type === 'bank')?.id ??
        null;
      walletId = from?.walletId ?? cash;
    } else {
      walletId = from?.walletId ?? untagged[0]?.walletId ?? null;
      toWalletId = to?.walletId ?? untagged.find((w) => w.walletId !== walletId)?.walletId ?? null;
    }
    if (walletId === toWalletId) toWalletId = null;
    walletConfidence = walletId && toWalletId ? (wallets.length > 0 ? 0.95 : 0.7) : 0.4;
  } else {
    walletId = wallets[0]?.walletId ?? defaultWallet(ctx);
    walletConfidence = wallets.length > 0 ? 1 : 0.8;
  }

  const currency: CurrencyCode = amounts.main?.currency ?? base;
  const amount = amounts.main ? toMinor(amounts.main.value, currency) : null;
  const amountConfidence = !amounts.main ? 0 : amounts.weak ? 0.4 : amounts.main.words ? 0.9 : 1;
  const feeCurrency: CurrencyCode = amounts.fee?.currency ?? currency;
  const fee = amounts.fee ? toMinor(amounts.fee.value, feeCurrency) : 0;

  const note = noteFrom(tokens, claimed);
  const item: ParsedItem = {
    type,
    amount: amount && amount > 0 ? amount : null,
    currency,
    walletId,
    toWalletId: type === 'transfer' ? toWalletId : null,
    categoryId: category?.id ?? null,
    date: date?.date ?? ctx.today,
    note,
    feeAmount: type === 'transfer' ? fee : 0,
    person: typeCue?.person ?? null,
    debt: typeCue?.debt ?? null,
    phrase: category?.phrase || note.toLowerCase(),
    confidence: {
      amount: amountConfidence,
      type: typeConfidence,
      wallet: walletConfidence,
      category: categoryConfidence,
      date: date ? 1 : 0.9,
    },
    uncertain: [],
  };
  const drafts: Draft[] = [
    {
      item,
      explicitType: typeCue !== null,
      explicitWallet: wallets.length > 0,
      explicitDate: date !== null,
    },
  ];

  // A fee on spending or income is its own expense, so balances stay right.
  if (fee > 0 && type !== 'transfer') {
    const feeCategory = categoryByName(ctx, MOBILE_MONEY_FEES_CATEGORY, 'expense');
    drafts.push({
      item: {
        ...item,
        type: 'expense',
        amount: fee,
        currency: feeCurrency,
        categoryId: feeCategory?.id ?? null,
        note: 'Fee',
        person: null,
        debt: null,
        phrase: 'fee',
        confidence: { ...item.confidence, amount: 1, type: 0.95, category: feeCategory ? 0.9 : 0 },
      },
      explicitType: true,
      explicitWallet: wallets.length > 0,
      explicitDate: date !== null,
    });
  }
  return drafts;
}

/** Splits at "and", ",", "then", "plus" where each side has its own amount. */
function splitSegments(tokens: readonly string[], today: string): string[][] {
  const raw: { tokens: string[]; separator: string | null }[] = [{ tokens: [], separator: null }];
  tokens.forEach((t, i) => {
    if (SEPARATORS.has(t) && !isNumberAnd(tokens, i)) raw.push({ tokens: [], separator: t });
    else raw[raw.length - 1]!.tokens.push(t);
  });

  const merged: string[][] = [];
  let pending: string[] = [];
  for (const part of raw) {
    if (part.tokens.length === 0) continue;
    const last = merged[merged.length - 1];
    if (hasMainAmount(part.tokens, today)) {
      merged.push([...pending, ...part.tokens]);
      pending = [];
    } else if (last) {
      last.push(...(part.separator ? [part.separator] : []), ...part.tokens);
    } else {
      pending.push(...part.tokens);
    }
  }
  if (pending.length > 0) merged.push(pending);
  return merged;
}

function parseItems(tokens: readonly string[], ctx: ParseContext): ParsedItem[] {
  const segments = splitSegments(tokens, ctx.today);
  const groups = segments.map((s) => analyzeSegment(s, ctx));
  const mains = groups.map((g) => g[0]!);

  // Words said once apply to the whole sentence: "paid boda 5k and lunch 12k cash".
  const plain = mains.filter((d) => d.item.type !== 'transfer');
  const walletsSaid = new Set(plain.filter((d) => d.explicitWallet).map((d) => d.item.walletId));
  const datesSaid = new Set(mains.filter((d) => d.explicitDate).map((d) => d.item.date));
  const sharedWallet = walletsSaid.size === 1 ? [...walletsSaid][0]! : null;
  const sharedDate = datesSaid.size === 1 ? [...datesSaid][0]! : null;

  let lastType: Draft | null = null;
  for (const group of groups) {
    const main = group[0]!;
    for (const d of group) {
      if (sharedWallet && !d.explicitWallet && d.item.type !== 'transfer') {
        d.item.walletId = sharedWallet;
        d.item.confidence.wallet = 0.9;
      }
      if (sharedDate && !d.explicitDate) {
        d.item.date = sharedDate;
        d.item.confidence.date = 0.9;
      }
    }
    // "received 50k from Musa and 30k from Jane": an item with no verb takes the previous one's.
    if (
      !main.explicitType &&
      lastType &&
      !lastType.item.debt &&
      lastType.item.type !== 'transfer'
    ) {
      if (main.item.type !== lastType.item.type && lastType.item.type === 'income') {
        const reparsed = analyzeAs(main, lastType.item.type, ctx);
        group[0] = reparsed;
      } else {
        main.item.confidence.type = Math.max(main.item.confidence.type, 0.85);
      }
    }
    if (group[0]!.explicitType) lastType = group[0]!;
  }
  return groups.flat().map((d) => finish(d.item));
}

/** Re-files an item under another type (income inherited from an earlier item). */
function analyzeAs(draft: Draft, type: TransactionType, ctx: ParseContext): Draft {
  const tokens = tokenize(`${draft.item.note} ${draft.item.phrase}`);
  const kind = type === 'income' ? 'income' : 'expense';
  const category =
    findCategory(tokens, new Set(), ctx, kind) ??
    (kind === 'income'
      ? (() => {
          const other = categoryByName(ctx, FALLBACK_INCOME_CATEGORY, 'income');
          return other ? { id: other.id, confidence: 0.6, phrase: draft.item.phrase } : null;
        })()
      : null);
  return {
    ...draft,
    explicitType: true,
    item: {
      ...draft.item,
      type,
      categoryId: category?.id ?? null,
      confidence: { ...draft.item.confidence, type: 0.85, category: category?.confidence ?? 0 },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Intents: questions and commands

const QUESTION_STARTERS = new Set([
  'how',
  'hows',
  'what',
  'whats',
  'where',
  'when',
  'which',
  'did',
  'do',
  'does',
  'am',
  'can',
  'could',
  'show',
  'tell',
  'is',
  'are',
  'have',
  'whats',
  'wat',
]);

function readPeriod(tokens: readonly string[]): QuestionPeriod {
  const after = (w: string) => tokens[tokens.indexOf(w) + 1];
  if (tokens.includes('today')) return 'today';
  if (tokens.includes('yesterday')) return 'yesterday';
  if (tokens.includes('last') && after('last') === 'week') return 'last_week';
  if (tokens.includes('last') && after('last') === 'month') return 'last_month';
  if (tokens.includes('week')) return 'this_week';
  if (tokens.includes('year')) return 'this_year';
  return 'this_month';
}

const GOAL_QUESTION_FILLER = new Set([
  ...QUESTION_STARTERS,
  'goal',
  'goals',
  'much',
  'many',
  'doing',
  'going',
  'progress',
  'saved',
  'save',
  'left',
  'far',
  'close',
  'near',
  'track',
  'status',
  'reach',
  'reached',
  'today',
  'yesterday',
  'week',
  'month',
  'year',
  'last',
]);

function readQuestion(tokens: readonly string[], ctx: ParseContext): ParsedQuestion | null {
  const period = readPeriod(tokens);
  if (has(tokens, ['budget', 'budgets'])) {
    const category = findCategory(tokens, new Set(), ctx, 'expense');
    return {
      metric: 'budget_left',
      categoryId: category?.id ?? null,
      walletId: null,
      period,
      goal: null,
    };
  }
  if (has(tokens, ['goal', 'goals'])) {
    const name = tokens
      .filter((t) => !GOAL_QUESTION_FILLER.has(t) && !STOP_WORDS.has(t) && /^[a-z]/.test(t))
      .join(' ');
    return {
      metric: 'goal_progress',
      categoryId: null,
      walletId: null,
      period,
      goal: name || null,
    };
  }
  if (has(tokens, ['afford', 'should', 'advice', 'save', 'owe', 'owes'])) {
    return null;
  }
  const claimed: Claimed = new Set();
  const wallet = findWallets(tokens, claimed, ctx)[0]?.walletId ?? null;

  let metric: QuestionMetric | null = null;
  if (
    has(tokens, ['most', 'top', 'biggest', 'highest']) ||
    (tokens.includes('where') && tokens.includes('go'))
  ) {
    metric = 'top_categories';
  } else if (
    has(tokens, ['spend', 'spent', 'expenses', 'expense', 'pay', 'paid', 'use', 'used', 'cost'])
  ) {
    metric = 'spent';
  } else if (
    has(tokens, ['earn', 'earned', 'income', 'received', 'receive', 'make', 'made', 'got', 'get'])
  ) {
    metric = 'earned';
  } else if (has(tokens, ['balance', 'left', 'remaining', 'have', 'got']) || wallet) {
    metric = 'balance';
  }
  if (!metric) return null;

  const category =
    metric === 'spent' || metric === 'earned'
      ? findCategory(tokens, claimed, ctx, metric === 'earned' ? 'income' : 'expense')
      : null;
  return { metric, categoryId: category?.id ?? null, walletId: wallet, period, goal: null };
}

function readCommand(
  tokens: readonly string[],
  intent: ParseIntent,
  ctx: ParseContext,
): ParsedCommand {
  const claimed: Claimed = new Set();
  const date = readDate(tokens, ctx.today, 'future');
  date?.indexes.forEach((i) => claimed.add(i));
  const { main } = readAmounts(tokens, claimed);
  const currency: CurrencyCode = main?.currency ?? ctx.baseCurrency ?? DEFAULT_CURRENCY;
  const category = intent === 'set_budget' ? findCategory(tokens, claimed, ctx, 'expense') : null;
  const filler = new Set([
    'remind',
    'set',
    'budget',
    'goal',
    'new',
    'create',
    'add',
    'put',
    'make',
    'want',
    'save',
    'saving',
    'towards',
    'contribute',
    'change',
    'limit',
  ]);
  const text = tokens
    .filter((t, i) => !claimed.has(i) && !filler.has(t) && !STOP_WORDS.has(t) && /^[a-z]/.test(t))
    .join(' ');
  return {
    categoryId: category?.id ?? null,
    amount: main ? toMinor(main.value, currency) : null,
    currency,
    date: date?.date ?? null,
    text: text ? capitalize(text) : '',
  };
}

function readIntent(tokens: readonly string[], ctx: ParseContext): ParseIntent {
  if (tokens.includes('remind')) return 'add_reminder';
  const amount = hasMainAmount(tokens, ctx.today);
  if (
    tokens.includes('budget') &&
    amount &&
    has(tokens, ['set', 'make', 'put', 'change', 'increase', 'reduce', 'limit', 'to', 'of', 'for'])
  ) {
    return 'set_budget';
  }
  if (has(tokens, ['goal', 'goals']) && amount) {
    if (has(tokens, ['add', 'added', 'put', 'contribute', 'contributed', 'saved', 'towards']))
      return 'contribute_goal';
    return 'set_goal';
  }
  if (tokens.includes('want') && has(tokens, ['save', 'saving']) && amount) return 'set_goal';
  if (QUESTION_STARTERS.has(tokens[0] ?? '') || tokens.includes('?')) return 'question';
  // "bought 2 sodas": a verb makes a bare quantity worth a card, with the amount marked uncertain.
  const weakWithVerb =
    hasMainAmount(tokens, ctx.today, true) && has(tokens, [...EXPENSE_WORDS, ...INCOME_WORDS]);
  return amount || weakWithVerb || has(tokens, ['lent', 'borrowed', 'repaid']) ? 'log' : 'unknown';
}

/**
 * Parses a spoken or typed line into transactions, a question or a command, offline and
 * synchronously (build prompt section 6.1).
 */
export function localParse(text: string, ctx: ParseContext): ParseResult {
  const tokens = tokenize(text);
  const intent = readIntent(tokens, ctx);
  const result: ParseResult = {
    intent,
    transcript: text.trim(),
    items: [],
    question: null,
    command: null,
    confident: false,
  };

  if (intent === 'log') {
    result.items = parseItems(tokens, ctx);
    result.confident =
      result.items.length > 0 &&
      result.items.every((i) => !i.uncertain.includes('amount') && !i.uncertain.includes('type'));
  } else if (intent === 'question') {
    result.question = readQuestion(tokens, ctx);
    result.confident = result.question !== null;
  } else if (intent !== 'unknown') {
    result.command = readCommand(tokens, intent, ctx);
    result.confident = result.command.amount !== null || intent === 'add_reminder';
  }
  return result;
}
