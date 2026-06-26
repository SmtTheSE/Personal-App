import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Note } from '@/types'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const loading = ref(false)

  const pinnedNotes = computed(() =>
    notes.value.filter((n) => n.is_pinned).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  )

  const recentNotes = computed(() =>
    [...notes.value]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5)
  )

  async function fetchNotes() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      notes.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  function getNoteById(id: string) {
    return notes.value.find((n) => n.id === id)
  }

  async function createNote(note: {
    title: string
    content?: string
    project_id?: string
    resource_id?: string
    tags?: string[]
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: note.title,
        content: note.content ?? null,
        project_id: note.project_id ?? null,
        resource_id: note.resource_id ?? null,
        tags: note.tags ?? [],
      })
      .select()
      .single()

    if (error) throw error
    notes.value.unshift(data)
    return data
  }

  async function updateNote(id: string, updates: Partial<Note>) {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx !== -1) notes.value[idx] = data
    return data
  }

  async function togglePin(id: string) {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return
    return updateNote(id, { is_pinned: !note.is_pinned })
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    notes.value = notes.value.filter((n) => n.id !== id)
  }

  function searchNotes(query: string) {
    const q = query.toLowerCase()
    return notes.value.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.content?.toLowerCase().includes(q) ?? false) ||
        (n.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
    )
  }

  return {
    notes,
    loading,
    pinnedNotes,
    recentNotes,
    fetchNotes,
    getNoteById,
    createNote,
    updateNote,
    togglePin,
    deleteNote,
    searchNotes,
  }
})
