<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useIntegrationsStore } from '@/stores/integrations'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useUiStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import { PhMoon, PhSun, PhSignOut, PhTarget, PhTable, PhGithubLogo, PhRocketLaunch, PhBroom, PhCalendar } from '@phosphor-icons/vue'
import { initialsFromString, gradientFromString } from '@/lib/color'

const auth = useAuthStore()
const integrations = useIntegrationsStore()
const googleCalendar = useGoogleCalendarStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const isDark = useDark()
const { run } = useAsyncAction()

const username = ref(auth.profile?.username ?? '')
const studyGoal = ref(String(auth.profile?.study_goal_mins ?? 120))
const saving = ref(false)
const vercelToken = ref('')
const savingVercel = ref(false)
const savingCalendarSettings = ref(false)

async function connectGoogleCalendar() {
  await run(() => googleCalendar.connect())
}

async function disconnectGoogleCalendar() {
  await run(async () => {
    await googleCalendar.disconnect()
    await integrations.fetchStatuses()
  }, { successMessage: 'Google Calendar disconnected' })
}

async function syncGoogleCalendarNow() {
  await run(() => googleCalendar.syncNow(), { successMessage: 'Calendar synced' })
}

async function updateCalendarToggle(key: 'sync_tasks' | 'sync_exams', value: boolean) {
  savingCalendarSettings.value = true
  await run(() => googleCalendar.updateSettings({ [key]: value }), { successMessage: 'Calendar settings saved' })
  savingCalendarSettings.value = false
}

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

async function reconnectGithub() {
  await auth.signInWithGitHub()
}

async function saveVercelToken() {
  savingVercel.value = true
  await run(() => integrations.saveVercelToken(vercelToken.value), { successMessage: 'Vercel connected' })
  vercelToken.value = ''
  savingVercel.value = false
}

async function disconnectIntegration(provider: 'github' | 'vercel') {
  await run(() => integrations.disconnect(provider), { successMessage: 'Disconnected' })
}

onMounted(async () => {
  await Promise.all([
    integrations.fetchStatuses().catch(() => {}),
    googleCalendar.loadStatus().catch(() => {}),
  ])

  const calendarStatus = route.query.calendar
  if (calendarStatus === 'connected') {
    ui.showToast('Google Calendar connected', 'success')
    router.replace({ query: {} })
  } else if (calendarStatus === 'error') {
    const message = typeof route.query.message === 'string' ? route.query.message : 'Connection failed'
    ui.showToast(message, 'error')
    router.replace({ query: {} })
  }
})
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
        <IOSListItem title="Data Cleaning" subtitle="CSV/Excel profiling, dedup & export" @click="router.push('/data-cleaning')">
          <template #icon>
            <PhBroom :size="22" class="text-[var(--color-system-orange)]" />
          </template>
        </IOSListItem>
        <IOSListItem title="Deployments" subtitle="GitHub repos & Vercel deploy analytics" @click="router.push('/deployments')">
          <template #icon>
            <PhRocketLaunch :size="22" class="text-[var(--color-system-blue)]" />
          </template>
        </IOSListItem>
      </IOSListGroup>

      <IOSListGroup title="Integrations">
        <IOSListItem
          title="GitHub"
          :subtitle="integrations.githubConnected ? 'Connected — repo access for imports' : 'Sign in to list your repos'"
        >
          <template #icon>
            <PhGithubLogo :size="22" class="text-primary" weight="fill" />
          </template>
          <template #trailing>
            <div class="flex gap-2" @click.stop>
              <IOSButton v-if="!integrations.githubConnected" size="sm" @click="reconnectGithub">
                Connect
              </IOSButton>
              <IOSButton v-else size="sm" variant="bordered" @click="reconnectGithub">
                Reconnect
              </IOSButton>
            </div>
          </template>
        </IOSListItem>
        <div v-if="integrations.githubConnected" class="px-4 py-2">
          <IOSButton variant="plain" size="sm" class="text-system-red" @click="disconnectIntegration('github')">
            Disconnect GitHub token
          </IOSButton>
        </div>

        <div class="px-4 py-3">
          <label class="text-section-header">Vercel API token</label>
          <p class="text-caption-1 mb-2 text-tertiary">
            Create at vercel.com/account/tokens — used server-side for deploy status.
          </p>
          <input
            v-model="vercelToken"
            type="password"
            autocomplete="off"
            placeholder="vercel_..."
            class="w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none focus:ring-2 focus:ring-[var(--color-system-blue)]/30"
          />
          <div class="mt-2 flex gap-2">
            <IOSButton size="sm" :loading="savingVercel" @click="saveVercelToken">
              {{ integrations.vercelConnected ? 'Update token' : 'Save token' }}
            </IOSButton>
            <IOSButton
              v-if="integrations.vercelConnected"
              size="sm"
              variant="plain"
              class="text-system-red"
              @click="disconnectIntegration('vercel')"
            >
              Disconnect
            </IOSButton>
          </div>
          <p v-if="integrations.vercelConnected" class="text-caption-2 mt-2 text-system-green">
            Vercel connected
          </p>
        </div>

        <IOSListItem
          title="Google Calendar"
          :subtitle="googleCalendar.connected ? `Connected as ${googleCalendar.email ?? 'Google account'}` : 'Sync exams & task due dates to Google Calendar'"
        >
          <template #icon>
            <PhCalendar :size="22" class="text-[var(--color-system-red)]" weight="fill" />
          </template>
          <template #trailing>
            <div class="flex gap-2" @click.stop>
              <IOSButton v-if="!googleCalendar.connected" size="sm" @click="connectGoogleCalendar">
                Connect
              </IOSButton>
              <IOSButton v-else size="sm" variant="bordered" :loading="googleCalendar.syncing" @click="syncGoogleCalendarNow">
                Sync now
              </IOSButton>
            </div>
          </template>
        </IOSListItem>

        <div v-if="googleCalendar.connected" class="space-y-1 px-4 py-2">
          <IOSListItem title="Sync task due dates" @click.prevent>
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="googleCalendar.settings.sync_tasks !== false"
                  label="Sync tasks"
                  :disabled="savingCalendarSettings"
                  @update:model-value="updateCalendarToggle('sync_tasks', $event)"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSListItem title="Sync exams" @click.prevent>
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="googleCalendar.settings.sync_exams !== false"
                  label="Sync exams"
                  :disabled="savingCalendarSettings"
                  @update:model-value="updateCalendarToggle('sync_exams', $event)"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSButton variant="plain" size="sm" class="text-system-red" @click="disconnectGoogleCalendar">
            Disconnect Google Calendar
          </IOSButton>
        </div>
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
