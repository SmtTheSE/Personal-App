import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

function defaultUsername(user: User): string {
  const meta = user.user_metadata?.username as string | undefined
  if (meta?.trim()) return meta.trim()
  const emailPrefix = user.email?.split('@')[0]
  return emailPrefix?.trim() || 'student'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!session.value)

  const needsOnboarding = computed(() => {
    if (!isAuthenticated.value || !user.value) return false
    if (user.value.user_metadata?.onboarding_complete === true) return false
    if (profile.value?.username && profile.value.username.length >= 2) return false
    return true
  })

  async function initialize() {
    if (initialized.value) return

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null

    if (user.value) {
      await ensureProfile()
    }

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
      if (user.value) {
        await ensureProfile()
      } else {
        profile.value = null
      }
    })

    initialized.value = true
  }

  async function fetchProfile() {
    if (!user.value) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .maybeSingle()

    if (error) throw error
    if (data) {
      profile.value = data
      await migrateOnboardingFlagIfNeeded(data)
    }
    return data
  }

  async function migrateOnboardingFlagIfNeeded(existing: Profile) {
    if (!user.value) return
    if (user.value.user_metadata?.onboarding_complete === true) return
    if (!existing.username || existing.username.length < 2) return

    const { data, error } = await supabase.auth.updateUser({
      data: { onboarding_complete: true, username: existing.username },
    })
    if (!error && data.user) user.value = data.user
  }

  /** Create profile row if trigger missed it (schema not applied, race, etc.) */
  async function ensureProfile(preferredUsername?: string) {
    if (!user.value) return null

    const existing = await fetchProfile()
    if (existing) return existing

    const username = preferredUsername?.trim() || defaultUsername(user.value)

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.value.id,
          username,
          study_goal_mins: 120,
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) throw error
    profile.value = data
    return data
  }

  async function completeOnboarding(username: string, studyGoalMins = 120) {
    if (!user.value) throw new Error('Not authenticated')

    const trimmed = username.trim()
    if (trimmed.length < 2) throw new Error('Username must be at least 2 characters')

    await ensureProfile(trimmed)

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: trimmed,
        study_goal_mins: studyGoalMins,
      })
      .eq('id', user.value.id)
      .select()
      .single()

    if (error) throw error
    profile.value = data

    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: { onboarding_complete: true, username: trimmed },
    })
    if (authError) throw authError
    user.value = authData.user

    return data
  }

  async function signUp(email: string, password: string, username?: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username?.trim(),
            onboarding_complete: false,
          },
        },
      })
      if (error) throw error

      if (data.session) {
        session.value = data.session
        user.value = data.user
        await ensureProfile(username?.trim())
      }

      return data
    } finally {
      loading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      session.value = data.session
      user.value = data.user
      await ensureProfile()
      return data
    } finally {
      loading.value = false
    }
  }

  async function signInWithGitHub() {
    loading.value = true
    try {
      const redirectTo = `${window.location.origin}/`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo },
      })
      if (error) throw error
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      profile.value = null
      user.value = null
      session.value = null
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user.value) throw new Error('Not authenticated')

    await ensureProfile()

    if (updates.username !== undefined) {
      const trimmed = updates.username?.trim()
      if (!trimmed || trimmed.length < 2) {
        throw new Error('Username must be at least 2 characters')
      }
      updates.username = trimmed
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
      .select()
      .single()

    if (error) throw error
    profile.value = data

    if (updates.username) {
      await supabase.auth.updateUser({ data: { username: updates.username } })
    }

    return data
  }

  return {
    user,
    session,
    profile,
    loading,
    initialized,
    isAuthenticated,
    needsOnboarding,
    initialize,
    fetchProfile,
    ensureProfile,
    completeOnboarding,
    signUp,
    signIn,
    signInWithGitHub,
    signOut,
    updateProfile,
  }
})
