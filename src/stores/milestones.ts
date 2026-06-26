import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ProjectMilestone } from '@/types'

export const useMilestonesStore = defineStore('milestones', () => {
  const milestones = ref<ProjectMilestone[]>([])
  const loading = ref(false)

  function forProject(projectId: string) {
    return milestones.value
      .filter((m) => m.project_id === projectId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function progressForProject(projectId: string) {
    const items = forProject(projectId)
    if (!items.length) return 0
    return Math.round((items.filter((m) => m.completed).length / items.length) * 100)
  }

  async function fetchMilestones() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      milestones.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function createMilestone(projectId: string, title: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const existing = forProject(projectId)
    const sortOrder = existing.length ? Math.max(...existing.map((m) => m.sort_order)) + 1 : 0

    const { data, error } = await supabase
      .from('project_milestones')
      .insert({
        user_id: user.id,
        project_id: projectId,
        title,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) throw error
    milestones.value.push(data)
    return data
  }

  async function toggleMilestone(id: string) {
    const milestone = milestones.value.find((m) => m.id === id)
    if (!milestone) return

    const { data, error } = await supabase
      .from('project_milestones')
      .update({ completed: !milestone.completed })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    const idx = milestones.value.findIndex((m) => m.id === id)
    if (idx !== -1) milestones.value[idx] = data
    return data
  }

  async function deleteMilestone(id: string) {
    const { error } = await supabase.from('project_milestones').delete().eq('id', id)
    if (error) throw error
    milestones.value = milestones.value.filter((m) => m.id !== id)
  }

  return {
    milestones,
    loading,
    forProject,
    progressForProject,
    fetchMilestones,
    createMilestone,
    toggleMilestone,
    deleteMilestone,
  }
})
