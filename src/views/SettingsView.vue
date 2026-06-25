<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import { PhMoon, PhSun, PhSignOut, PhTarget } from '@phosphor-icons/vue'
import { initialsFromString, gradientFromString } from '@/lib/color'

const auth = useAuthStore()
const router = useRouter()
const isDark = useDark()

const username = ref(auth.profile?.username ?? '')
const studyGoal = ref(String(auth.profile?.study_goal_mins ?? 120))
const saving = ref(false)

const displayName = () => auth.profile?.username ?? 'Student'
const avatarGradient = () => gradientFromString(displayName())

async function saveProfile() {
  saving.value = true
  try {
    await auth.updateProfile({
      username: username.value,
      study_goal_mins: parseInt(studyGoal.value) || 120,
    })
  } finally {
    saving.value = false
  }
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
      <!-- Profile header — Apple ID style -->
      <div class="flex flex-col items-center px-4 py-6">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg"
          :style="{ background: avatarGradient() }"
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
            class="mt-1 w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none focus:ring-2 focus:ring-system-blue/30"
          />
        </div>
        <div class="px-4 py-3">
          <label class="text-section-header">Daily Study Goal (min)</label>
          <input
            v-model="studyGoal"
            type="number"
            class="mt-1 w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none focus:ring-2 focus:ring-system-blue/30"
          />
        </div>
      </IOSListGroup>

      <div class="px-4">
        <IOSButton block :loading="saving" @click="saveProfile">Save Profile</IOSButton>
      </div>

      <IOSListGroup title="Appearance">
        <IOSListItem title="Dark Mode">
          <template #icon>
            <component :is="isDark ? PhMoon : PhSun" :size="22" class="text-system-blue" />
          </template>
          <template #trailing>
            <IOSSwitch
              :model-value="isDark"
              label="Dark mode"
              @update:model-value="isDark = $event"
            />
          </template>
        </IOSListItem>
      </IOSListGroup>

      <IOSListGroup title="Account">
        <IOSListItem :subtitle="auth.user?.email ?? ''" title="Email">
          <template #icon>
            <PhTarget :size="22" class="text-system-blue" />
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
