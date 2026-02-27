// Standardized time durations in milliseconds for timeouts and delays.

// Common time constants in milliseconds.
export const TIME = {
  // 0ms, used for immediate execution.
  IMMEDIATE: 0,
  // 10,000ms (10 seconds).
  VERY_SHORT: 10000,
  // 20,000ms (20 seconds).
  SHORT: 20000,
  // 60,000ms (1 minute).
  MEDIUM: 60000,
  // 120,000ms (2 minutes).
  LONG: 120000,
  // 300,000ms (5 minutes).
  VERY_LONG: 300000
} as const
