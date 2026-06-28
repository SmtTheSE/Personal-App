export type PlanBlockKind = 'fixed' | 'deadline' | 'focus_suggestion'

export type PlanSourceType =
  | 'google'
  | 'exam'
  | 'task'
  | 'focus'
  | 'review'
  | 'study'
  | 'github'

export interface PlanTimeBlock {
  id: string
  kind: PlanBlockKind
  title: string
  subtitle?: string
  start: Date
  end: Date
  sourceType: PlanSourceType
  sourceId?: string
  path?: string
  externalUrl?: string
  suggested?: boolean
}

export interface DayPlan {
  day: Date
  label: string
  isToday: boolean
  blocks: PlanTimeBlock[]
  studyGoalMins: number
  studyScheduledMins: number
  openTaskCount: number
}

export interface WeeklyPlanSummary {
  days: DayPlan[]
  weekLabel: string
  totalStudyGoalMins: number
  totalStudyScheduledMins: number
  pendingTasks: number
  githubTaskCount: number
  prReviewCount: number
}
