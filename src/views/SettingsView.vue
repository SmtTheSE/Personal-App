<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import { PhMoon, PhSun, PhSignOut, PhTarget, PhTable } from '@phosphor-icons/vue'
import { initialsFromString, gradientFromString } from '@/lib/color'

const auth = useAuthStore()
const router = useRouter()
const isDark = useDark()
const { run } = useAsyncAction()

const username = ref(auth.profile?.username ?? '')
const studyGoal = ref(String(auth.profile?.study_goal_mins ?? 120))
const saving = ref(false)

watch(
  () => auth.profile,
  (profile) => {
    if (profile) {
      username.value = profile.username ?? ''
      studyGoal.value = String(profile.study_goal_mins ?? 120)
    }
  },
  { immediate: true }
)

const displayName = () => auth.profile?.username ?? auth.user?.email?.split('@')[0] ?? 'Student'

async function saveProfile() {
  saving.value = true
  await run(
    () =>
      auth.updateProfile({
        username: username.value,
        study_goal_mins: parseInt(studyGoal.value) || 120,
      }),
    { successMessage: 'Profile saved' }
  )
  saving.value = false
}

async function handleSignOut() {
  await auth.signOut()
  router.push('/auth')
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Settings" large show-back />
    </template>

    <div class="space-y-6 py-4">
      <div class="flex flex-col items-center px-4 py-6">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg"
          :style="{ background: gradientFromString(displayName()) }"
        >
          {{ initialsFromString(displayName()) }}
        </div>
        <h2 class="text-title-2 mt-3 text-primary">{{ displayName() }}</h2>
        <p class="text-subheadline text-tertiary">{{ auth.user?.email }}</p>
      </div>

      <IOSListGroup title="Profile">
        <div class="px-4 py-3">
          <label class="text-section-header">Username</label>
          <input
            v-model="username"
            class="mt-1 w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none focus:ring-2 focus:ring-[var(--color-system-blue)]/30"
            autocomplete="username"
          />
        </div>
        <div class="px-4 py-3">
          <label class="text-section-header">Daily Study Goal (min)</label>
          <input
            v-model="studyGoal"
            type="number"
            min="1"
            class="mt-1 w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none focus:ring-2 focus:ring-[var(--color-system-blue)]/30"
          />
        </div>
      </IOSListGroup>

      <div class="px-4">
        <IOSButton block variant="filled" :loading="saving" @click="saveProfile">
          Save Profile
        </IOSButton>
      </div>

      <IOSListGroup title="Data">
        <IOSListItem title="Sheet Automations" subtitle="Spreadsheets with formulas & auto-rules" @click="router.push('/sheets')">
          <template #icon>
            <PhTable :size="22" class="text-[var(--color-system-green)]" />
          </template>
        </IOSListItem>
      </IOSListGroup>

      <IOSListGroup title="Appearance">
        <IOSListItem title="Dark Mode" @click.prevent>
          <template #icon>
            <component :is="isDark ? PhMoon : PhSun" :size="22" class="text-[var(--color-system-blue)]" />
          </template>
          <template #trailing>
            <div @click.stop>
              <IOSSwitch
                :model-value="!!isDark"
                label="Dark mode"
                @update:model-value="isDark = $event"
              />
            </div>
          </template>
        </IOSListItem>
      </IOSListGroup>

      <IOSListGroup title="Account">
        <IOSListItem :subtitle="auth.user?.email ?? ''" title="Email">
          <template #icon>
            <PhTarget :size="22" class="text-[var(--color-system-blue)]" />
          </template>
        </IOSListItem>
      </IOSListGroup>

      <div class="px-4">
        <IOSButton variant="destructive" block @click="handleSignOut">
          <PhSignOut :size="18" class="mr-2 inline" />
          Sign Out
        </IOSButton>
      </div>

      <p class="text-center text-caption-1 text-tertiary">Nexus v1.0 · Student OS</p>
    </div>
  </PageShell>
</template>
