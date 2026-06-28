export type NotificationEventType =
  | 'deploy_fail'
  | 'exam_reminder'
  | 'streak_at_risk'
  | 'pr_review_requested'
  | 'daily_digest'

export interface NotificationPayload {
  event_type: NotificationEventType
  title: string
  body: string
  dedupe_key?: string
  payload?: Record<string, unknown>
  telegram_html?: string
}

export interface NotificationPreferences {
  telegram: boolean
  web_push: boolean
  in_app: boolean
  alert_deploy_fail: boolean
  alert_exam_reminder: boolean
  alert_streak_at_risk: boolean
  alert_pr_review: boolean
  digest_enabled: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  telegram: true,
  web_push: true,
  in_app: true,
  alert_deploy_fail: true,
  alert_exam_reminder: true,
  alert_streak_at_risk: true,
  alert_pr_review: true,
  digest_enabled: false,
}

export function parseNotificationPrefs(metadata: Record<string, unknown>): NotificationPreferences {
  const raw = metadata.notifications
  const n = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    telegram: n.telegram !== false,
    web_push: n.web_push !== false,
    in_app: n.in_app !== false,
    alert_deploy_fail: n.alert_deploy_fail !== false,
    alert_exam_reminder: n.alert_exam_reminder !== false,
    alert_streak_at_risk: n.alert_streak_at_risk !== false,
    alert_pr_review: n.alert_pr_review !== false,
    digest_enabled: n.digest_enabled === true,
  }
}

export function eventEnabled(prefs: NotificationPreferences, type: NotificationEventType): boolean {
  switch (type) {
    case 'deploy_fail':
      return prefs.alert_deploy_fail
    case 'exam_reminder':
      return prefs.alert_exam_reminder
    case 'streak_at_risk':
      return prefs.alert_streak_at_risk
    case 'pr_review_requested':
      return prefs.alert_pr_review
    case 'daily_digest':
      return prefs.digest_enabled
    default:
      return true
  }
}
