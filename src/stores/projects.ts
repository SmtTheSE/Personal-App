import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectStatus } from '@/types'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProjects = computed(() =>
    projects.value.filter((p) => p.status === 'active')
  )

  const completedProjects = computed(() =>
    projects.value.filter((p) => p.status === 'completed')
  )

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (err) throw err
      projects.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load projects'
    } finally {
      loading.value = false
    }
  }

  async function createProject(project: {
    title: string
    description?: string
    status?: ProjectStatus
    tech_stack?: string[]
    repo_url?: string
    demo_url?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: err } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: project.title,
        description: project.description ?? null,
        status: project.status ?? 'active',
        tech_stack: project.tech_stack ?? [],
        repo_url: project.repo_url ?? null,
        demo_url: project.demo_url ?? null,
      })
      .select()
      .single()

    if (err) throw err
    projects.value.unshift(data as Project)
    return data as Project
  }

  async function updateProject(id: string, updates: Partial<Project>) {
    const { data, error: err } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) projects.value[idx] = data as Project
    return data as Project
  }

  async function deleteProject(id: string) {
    const { error: err } = await supabase.from('projects').delete().eq('id', id)
    if (err) throw err
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  function getProjectById(id: string) {
    return projects.value.find((p) => p.id === id)
  }

  return {
    projects,
    loading,
    error,
    activeProjects,
    completedProjects,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectById,
  }
})
