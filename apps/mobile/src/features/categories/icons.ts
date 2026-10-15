import { STORED_ICON_KEYS } from '@meledger/shared';

const NOT_FOR_CATEGORIES = new Set([
  'lend',
  'borrow',
  'repay',
  'repaid',
  'cash',
  'mobile-money',
  'bank',
  'card',
]);

/** Icons offered for a custom category: every category and goal icon. */
export const CATEGORY_ICONS = STORED_ICON_KEYS.filter((k) => !NOT_FOR_CATEGORIES.has(k));
