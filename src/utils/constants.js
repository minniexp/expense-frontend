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
export const POINTS_OPTIONS = [0, 1, 1.5, 3, 5, 7, 10];

// Month names mapping
export const MONTH_NAMES = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
}; 

export const monthToReturnIdMap = {
    1: process.env.NEXT_PUBLIC_JAN_RETURNID,
    2: process.env.NEXT_PUBLIC_FEB_RETURNID,
    3: process.env.NEXT_PUBLIC_MAR_RETURNID,
    4: process.env.NEXT_PUBLIC_APR_RETURNID,
    5: process.env.NEXT_PUBLIC_MAY_RETURNID,
    6: process.env.NEXT_PUBLIC_JUN_RETURNID,
    7: process.env.NEXT_PUBLIC_JUL_RETURNID,
    8: process.env.NEXT_PUBLIC_AUG_RETURNID,
    9: process.env.NEXT_PUBLIC_SEP_RETURNID,
    10: process.env.NEXT_PUBLIC_OCT_RETURNID,
    11: process.env.NEXT_PUBLIC_NOV_RETURNID,
    12: process.env.NEXT_PUBLIC_DEC_RETURNID
  };