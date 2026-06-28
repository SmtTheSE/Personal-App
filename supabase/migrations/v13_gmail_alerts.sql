-- Gmail inbox keyword alerts (school email notifications)

alter table public.notification_events drop constraint if exists notification_events_event_type_check;
alter table public.notification_events add constraint notification_events_event_type_check
  check (event_type in (
    'deploy_fail', 'exam_reminder', 'streak_at_risk', 'pr_review_requested', 'daily_digest', 'gmail_alert'
  ));
