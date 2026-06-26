import { addDays, format } from 'date-fns'

/** Simplified SM-2 scheduling for interview revisit */
export function scheduleNextReview(reviewCount: number, intervalDays: number): {
  review_count: number
  interval_days: number
  next_review_at: string
} {
  const count = reviewCount + 1
  let interval = intervalDays
  if (count === 1) interval = 1
  else if (count === 2) interval = 3
  else if (count === 3) interval = 7
  else interval = Math.min(30, Math.round(intervalDays * 1.8))

  return {
    review_count: count,
    interval_days: interval,
    next_review_at: format(addDays(new Date(), interval), 'yyyy-MM-dd'),
  }
}

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const
