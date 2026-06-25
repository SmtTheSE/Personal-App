import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Resource, ResourceType } from '@/types'

export const useResourcesStore = defineStore('resources', () => {
  const resources = ref<Resource[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const activeTag = ref<string | null>(null)
  const activeType = ref<ResourceType | null>(null)

  const allTags = computed(() => {
    const tags = new Set<string>()
    resources.value.forEach((r) => r.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  })

  const filteredResources = computed(() => {
    let result = resources.value

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    if (activeTag.value) {
      result = result.filter((r) => r.tags.includes(activeTag.value!))
    }

    if (activeType.value) {
      result = result.filter((r) => r.type === activeType.value)
    }

    return result
  })

  const favorites = computed(() => resources.value.filter((r) => r.is_favorite))

  async function fetchResources() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      resources.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load resources'
    } finally {
      loading.value = false
    }
  }

  async function createResource(resource: {
    title: string
    url?: string
    type?: ResourceType
    tags?: string[]
    notes?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: err } = await supabase
      .from('resources')
      .insert({
        user_id: user.id,
        title: resource.title,
        url: resource.url ?? null,
        type: resource.type ?? 'article',
        tags: resource.tags ?? [],
        notes: resource.notes ?? null,
      })
      .select()
      .single()

    if (err) throw err
    resources.value.unshift(data)
    return data
  }

  async function updateResource(id: string, updates: Partial<Resource>) {
    const { data, error: err } = await supabase
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    const idx = resources.value.findIndex((r) => r.id === id)
    if (idx !== -1) resources.value[idx] = data
    return data
  }

  async function toggleFavorite(id: string) {
    const resource = resources.value.find((r) => r.id === id)
    if (!resource) return
    return updateResource(id, { is_favorite: !resource.is_favorite })
  }

  async function deleteResource(id: string) {
    const { error: err } = await supabase.from('resources').delete().eq('id', id)
    if (err) throw err
    resources.value = resources.value.filter((r) => r.id !== id)
  }

  return {
    resources,
    loading,
    error,
    searchQuery,
    activeTag,
    activeType,
    allTags,
    filteredResources,
    favorites,
    fetchResources,
    createResource,
    updateResource,
    toggleFavorite,
    deleteResource,
  }
})
