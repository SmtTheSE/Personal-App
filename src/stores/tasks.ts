import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isToday, isPast, parseISO, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { enqueueCalendarSync } from '@/lib/calendar/syncClient'
import { kanbanColumnForStatus, statusForKanbanColumn } from '@/lib/kanban/columns'
import type { Task, TaskPriority, KanbanColumn } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let realtimeChannel: RealtimeChannel | null = null

  const todayTasks = computed(() =>
    tasks.value.filter((t) => {
      if (t.status === 'done') return false
      if (!t.due_date) return true
      const due = parseISO(t.due_date)
      return isToday(due) || isPast(startOfDay(due))
    })
  )

  const pendingTasks = computed(() =>
    tasks.value.filter((t) => t.status !== 'done')
  )

  const completedToday = computed(() =>
    tasks.value.filter((t) => {
      if (t.status !== 'done' || !t.completed_at) return false
      return isToday(parseISO(t.completed_at))
    })
  )

  const upcomingDeadlines = computed(() => {
    return tasks.value
      .filter((t) => t.status !== 'done' && t.due_date)
      .map((t) => ({ ...t, due: parseISO(t.due_date!) }))
      .filter((t) => !isPast(t.due) || isToday(t.due))
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .slice(0, 7)
  })

  const studyStreak = computed(() => {
    const completedDates = new Set(
      tasks.value
        .filter((t) => t.completed_at)
        .map((t) => t.completed_at!.split('T')[0])
    )

    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      if (completedDates.has(key)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  })

  const kanbanBoard = computed(() => {
    const columns: Record<KanbanColumn, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    }
    for (const task of tasks.value) {
      const column = kanbanColumnForStatus(task.status, task.kanban_column)
      columns[column].push(task)
    }
    for (const key of Object.keys(columns) as KanbanColumn[]) {
      columns[key].sort((a, b) => a.sort_order - b.sort_order)
    }
    return columns
  })

  async function fetchTasks() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (err) throw err
      tasks.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load tasks'
    } finally {
      loading.value = false
    }
  }

  function subscribeToRealtime() {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task
            if (!tasks.value.find((t) => t.id === newTask.id)) {
              tasks.value.push(newTask)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task
            const idx = tasks.value.findIndex((t) => t.id === updated.id)
            if (idx !== -1) tasks.value[idx] = updated
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Task
            tasks.value = tasks.value.filter((t) => t.id !== deleted.id)
          }
        }
      )
      .subscribe()
  }

  function unsubscribeRealtime() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  async function createTask(task: {
    title: string
    description?: string
    priority?: TaskPriority
    due_date?: string
    project_id?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const maxOrder = tasks.value.reduce((max, t) => Math.max(max, t.sort_order), 0)

    const { data, error: err } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description ?? null,
        priority: task.priority ?? 'medium',
        status: 'todo',
        kanban_column: 'todo',
        due_date: task.due_date ?? null,
        project_id: task.project_id ?? null,
        sort_order: maxOrder + 1,
      })
      .select()
      .single()

    if (err) throw err
    if (!tasks.value.find((t) => t.id === data.id)) {
      tasks.value.push(data)
    }
    enqueueCalendarSync('upsert', 'task', data.id)
    return data
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    const { data, error: err } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = data
    enqueueCalendarSync('upsert', 'task', id)
    return data
  }

  async function toggleComplete(id: string) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    const isDone = task.status !== 'done'
    return updateTask(id, {
      status: isDone ? 'done' : 'todo',
      kanban_column: isDone ? 'done' : 'todo',
      completed_at: isDone ? new Date().toISOString() : null,
    })
  }

  async function moveToKanbanColumn(id: string, column: KanbanColumn) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    const status = statusForKanbanColumn(column)
    return updateTask(id, {
      kanban_column: column,
      status,
      completed_at: column === 'done' ? task.completed_at ?? new Date().toISOString() : null,
    })
  }

  async function deleteTask(id: string) {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (err) throw err
    tasks.value = tasks.value.filter((t) => t.id !== id)
    enqueueCalendarSync('delete', 'task', id)
  }

  async function reorderTasks(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) => ({ id, sort_order: index }))
    for (const { id, sort_order } of updates) {
      await supabase.from('tasks').update({ sort_order }).eq('id', id)
    }
    tasks.value.sort((a, b) => a.sort_order - b.sort_order)
  }

  return {
    tasks,
    loading,
    error,
    todayTasks,
    pendingTasks,
    completedToday,
    upcomingDeadlines,
    studyStreak,
    kanbanBoard,
    fetchTasks,
    subscribeToRealtime,
    unsubscribeRealtime,
    createTask,
    updateTask,
    toggleComplete,
    moveToKanbanColumn,
    deleteTask,
    reorderTasks,
  }
})
