export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type KanbanColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type ResourceType = 'article' | 'paper' | 'tutorial' | 'video' | 'book' | 'tool' | 'other'
export type ProblemDifficulty = 'easy' | 'medium' | 'hard'

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  study_goal_mins: number
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string
  description: string | null
  status: ProjectStatus
  tech_stack: string[]
  repo_url: string | null
  demo_url: string | null
  thumbnail: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  user_id: string
  title: string
  url: string | null
  type: ResourceType
  tags: string[]
  notes: string | null
  is_favorite: boolean
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  kanban_column?: KanbanColumn
  due_date: string | null
  project_id: string | null
  sort_order: number
  completed_at: string | null
  created_at: string
}

export type SessionType = 'focus' | 'short_break' | 'long_break' | 'review'

export interface StudySession {
  id: string
  user_id: string
  topic: string
  duration_mins: number
  project_id: string | null
  session_type?: SessionType
  started_at: string
}

export type ExamColor = 'blue' | 'purple' | 'orange' | 'red' | 'green'

export interface Exam {
  id: string
  user_id: string
  title: string
  course: string | null
  exam_at: string
  location: string | null
  notes: string | null
  color: ExamColor
  created_at: string
}

export interface ExamPrepItem {
  id: string
  user_id: string
  exam_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

export interface InterviewProblem {
  id: string
  user_id: string
  title: string
  difficulty: ProblemDifficulty
  topics: string[]
  platform: string | null
  url: string | null
  solved_at: string | null
  revisit_date: string | null
  notes: string | null
  review_count?: number
  interval_days?: number
  next_review_at?: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  project_id: string | null
  resource_id: string | null
  is_pinned?: boolean
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface ProjectMilestone {
  id: string
  user_id: string
  project_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

export interface UserIntegration {
  id: string
  user_id: string
  provider: 'github' | 'vercel' | 'google_calendar' | 'telegram'
  access_token: string
  refresh_token: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CalendarSyncMapping {
  id: string
  user_id: string
  provider: string
  entity_type: 'task' | 'exam'
  entity_id: string
  external_calendar_id: string
  external_event_id: string
  content_hash: string
  last_synced_at: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> }
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Project> }
      resources: { Row: Resource; Insert: Omit<Resource, 'id' | 'created_at'> & { id?: string }; Update: Partial<Resource> }
      tasks: { Row: Task; Insert: Omit<Task, 'id' | 'created_at'> & { id?: string }; Update: Partial<Task> }
      study_sessions: { Row: StudySession; Insert: Omit<StudySession, 'id'> & { id?: string }; Update: Partial<StudySession> }
      interview_problems: { Row: InterviewProblem; Insert: Omit<InterviewProblem, 'id' | 'created_at'> & { id?: string }; Update: Partial<InterviewProblem> }
      notes: { Row: Note; Insert: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Note> }
      project_milestones: { Row: ProjectMilestone; Insert: Omit<ProjectMilestone, 'id' | 'created_at'> & { id?: string }; Update: Partial<ProjectMilestone> }
      exams: { Row: Exam; Insert: Omit<Exam, 'id' | 'created_at'> & { id?: string }; Update: Partial<Exam> }
      exam_prep_items: { Row: ExamPrepItem; Insert: Omit<ExamPrepItem, 'id' | 'created_at'> & { id?: string }; Update: Partial<ExamPrepItem> }
      user_integrations: { Row: UserIntegration; Insert: Omit<UserIntegration, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<UserIntegration> }
      calendar_sync_mappings: { Row: CalendarSyncMapping; Insert: Omit<CalendarSyncMapping, 'id' | 'created_at' | 'last_synced_at'> & { id?: string; last_synced_at?: string }; Update: Partial<CalendarSyncMapping> }
    }
  }
}
