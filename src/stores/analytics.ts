import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { StudySession, InterviewProblem, ProblemDifficulty } from '@/types'

export const useAnalyticsStore = defineStore('analytics', () => {
  const sessions = ref<StudySession[]>([])
  const loading = ref(false)

  const weeklyMinutes = computed(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sessions.value
      .filter((s) => new Date(s.started_at) >= weekAgo)
      .reduce((sum, s) => sum + s.duration_mins, 0)
  })

  const sessionsByDay = computed(() => {
    const map = new Map<string, number>()
    sessions.value.forEach((s) => {
      const day = s.started_at.split('T')[0]
      map.set(day, (map.get(day) ?? 0) + s.duration_mins)
    })
    return map
  })

  async function fetchSessions() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100)

      if (error) throw error
      sessions.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function logSession(topic: string, durationMins: number, projectId?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        topic,
        duration_mins: durationMins,
        project_id: projectId ?? null,
      })
      .select()
      .single()

    if (error) throw error
    sessions.value.unshift(data)
    return data
  }

  return { sessions, loading, weeklyMinutes, sessionsByDay, fetchSessions, logSession }
})

export const useInterviewStore = defineStore('interview', () => {
  const problems = ref<InterviewProblem[]>([])
  const loading = ref(false)
  const filterDifficulty = ref<ProblemDifficulty | null>(null)

  const filteredProblems = computed(() => {
    if (!filterDifficulty.value) return problems.value
    return problems.value.filter((p) => p.difficulty === filterDifficulty.value)
  })

  const solvedCount = computed(() => problems.value.filter((p) => p.solved_at).length)
  const dueForRevisit = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return problems.value.filter((p) => p.revisit_date && p.revisit_date <= today && !p.solved_at)
  })

  async function fetchProblems() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('interview_problems')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      problems.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function createProblem(problem: {
    title: string
    difficulty?: ProblemDifficulty
    topics?: string[]
    platform?: string
    url?: string
    notes?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('interview_problems')
      .insert({
        user_id: user.id,
        title: problem.title,
        difficulty: problem.difficulty ?? 'medium',
        topics: problem.topics ?? [],
        platform: problem.platform ?? null,
        url: problem.url ?? null,
        notes: problem.notes ?? null,
      })
      .select()
      .single()

    if (error) throw error
    problems.value.unshift(data)
    return data
  }

  async function markSolved(id: string) {
    const { data, error } = await supabase
      .from('interview_problems')
      .update({ solved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    const idx = problems.value.findIndex((p) => p.id === id)
    if (idx !== -1) problems.value[idx] = data
    return data
  }

  async function deleteProblem(id: string) {
    const { error } = await supabase.from('interview_problems').delete().eq('id', id)
    if (error) throw error
    problems.value = problems.value.filter((p) => p.id !== id)
  }

  return {
    problems,
    loading,
    filterDifficulty,
    filteredProblems,
    solvedCount,
    dueForRevisit,
    fetchProblems,
    createProblem,
    markSolved,
    deleteProblem,
  }
})
