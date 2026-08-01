// Common constants for the expense tracker application

// Payment methods
export const PAYMENT_METHODS = [
  'Chase College',
  'Sapphire Reserve',
  'Freedom',
  'Freedom Unlimited',
  'Freedom Flex',
  'Amazon Visa',
  'Discover',
  'Cash',
  'Schwab',
  'DiscoverChecking',
  'Amazon Gift Card',
];

// Categories
export const CATEGORIES = [
  'fuel',
  'personal',
  'parents-monthly',
  'parents-not monthly',
  'bill',
  'emergency',
  'travel',
  'offering',
  'doctors',
  'automobile',
  'korea',
  'business',
  'misc',
  'payroll',
];

// Categories budgeted against, monthly. A curated subset of CATEGORIES — the ones worth setting an
// allowance for, in the order they should appear in the budget editor.
export const BUDGET_CATEGORIES = [
  'fuel',
  'offering',
  'travel',
  'bill',
  'personal',
];

// Purchase categories
export const PURCHASE_CATEGORIES = [
  'groceries',
  'amazon',
  'dining',
  'gift',
  'gift card',
  'birthday gift',
  'wedding gift',
  'health',
  'flight',
  'hotel',
  'drugstore',
  'lyft',
  'travel',
  'international',
  'fuel',
];

// Points options
export const POINTS_OPTIONS = [0, 1, 1.5, 3, 4, 5, 7, 8, 10];

// Month names mapping
export const MONTH_NAMES = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
}; 

export const monthToReturnIdMap = {
    1: process.env.NEXT_PUBLIC_2025_JAN_RETURNID,
    2: process.env.NEXT_PUBLIC_2025_FEB_RETURNID,
    3: process.env.NEXT_PUBLIC_2025_MAR_RETURNID,
    4: process.env.NEXT_PUBLIC_2025_APR_RETURNID,
    5: process.env.NEXT_PUBLIC_2025_MAY_RETURNID,
    6: process.env.NEXT_PUBLIC_2025_JUN_RETURNID,
    7: process.env.NEXT_PUBLIC_2025_JUL_RETURNID,
    8: process.env.NEXT_PUBLIC_2025_AUG_RETURNID,
    9: process.env.NEXT_PUBLIC_2025_SEP_RETURNID,
    10: process.env.NEXT_PUBLIC_2025_OCT_RETURNID,
    11: process.env.NEXT_PUBLIC_2025_NOV_RETURNID,
    12: process.env.NEXT_PUBLIC_2025_DEC_RETURNID
  };

  export const MONTH_TO_RETURN_ID_MAP_2026 = {
    1: process.env.NEXT_PUBLIC_2026_JAN_RETURNID,
    2: process.env.NEXT_PUBLIC_2026_FEB_RETURNID,
    3: process.env.NEXT_PUBLIC_2026_MAR_RETURNID,
    4: process.env.NEXT_PUBLIC_2026_APR_RETURNID,
    5: process.env.NEXT_PUBLIC_2026_MAY_RETURNID,
    6: process.env.NEXT_PUBLIC_2026_JUN_RETURNID,
    7: process.env.NEXT_PUBLIC_2026_JUL_RETURNID,
    8: process.env.NEXT_PUBLIC_2026_AUG_RETURNID,
    9: process.env.NEXT_PUBLIC_2026_SEP_RETURNID,
    10: process.env.NEXT_PUBLIC_2026_OCT_RETURNID,
    11: process.env.NEXT_PUBLIC_2026_NOV_RETURNID,
    12: process.env.NEXT_PUBLIC_2026_DEC_RETURNID
  };