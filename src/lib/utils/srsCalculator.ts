/**
 * Spaced Repetition System (SRS) Calculator
 * Implements a simple interval-based SRS algorithm
 */

export const INTERVAL_LEVELS = {
  0: { days: 1, label: '1일 후' },
  1: { days: 3, label: '3일 후' },
  2: { days: 7, label: '7일 후' },
  3: { days: 30, label: '30일 후' },
} as const;

export type IntervalLevel = 0 | 1 | 2 | 3;

/**
 * Calculate the next review date based on interval level
 * @param intervalLevel Current interval level (0-3)
 * @returns Date object for the next review
 */
export function calculateNextReviewDate(intervalLevel: IntervalLevel = 0): Date {
  const now = new Date();
  const days = INTERVAL_LEVELS[intervalLevel].days;
  now.setDate(now.getDate() + days);
  return now;
}

/**
 * Get the next interval level after successful review
 * @param currentLevel Current interval level
 * @returns Next interval level (capped at 3)
 */
export function getNextIntervalLevel(currentLevel: IntervalLevel): IntervalLevel {
  if (currentLevel >= 3) return 3;
  return (currentLevel + 1) as IntervalLevel;
}

/**
 * Get human-readable label for interval level
 * @param level Interval level
 * @returns Human-readable label
 */
export function getIntervalLabel(level: number): string {
  if (level in INTERVAL_LEVELS) {
    return INTERVAL_LEVELS[level as IntervalLevel].label;
  }
  return '알 수 없음';
}

/**
 * Get days until next review
 * @param level Interval level
 * @returns Number of days
 */
export function getDaysUntilReview(level: number): number {
  if (level in INTERVAL_LEVELS) {
    return INTERVAL_LEVELS[level as IntervalLevel].days;
  }
  return 1;
}

/**
 * Calculate progress through SRS levels (0-100%)
 * @param level Current interval level
 * @returns Percentage (0-100)
 */
export function getProgressPercentage(level: number): number {
  if (level <= 0) return 0;
  if (level >= 3) return 100;
  return (level / 3) * 100;
}

/**
 * Format date for display
 * @param date Date object
 * @returns Formatted date string
 */
export function formatReviewDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a review is due
 * @param scheduledAt Scheduled review date (ISO string)
 * @returns True if review is overdue
 */
export function isReviewDue(scheduledAt: string): boolean {
  return new Date(scheduledAt) <= new Date();
}

/**
 * Get days remaining until review
 * @param scheduledAt Scheduled review date (ISO string)
 * @returns Number of days remaining (negative if overdue)
 */
export function getDaysRemaining(scheduledAt: string): number {
  const now = new Date();
  const reviewDate = new Date(scheduledAt);
  const diff = reviewDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
