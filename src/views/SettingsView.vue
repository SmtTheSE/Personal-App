<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useIntegrationsStore } from '@/stores/integrations'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useTelegramStore } from '@/stores/telegram'
import { useGmailStore } from '@/stores/gmail'
import { useCaptureStore } from '@/stores/capture'
import GmailCapturePanel from '@/components/settings/GmailCapturePanel.vue'
import ShortcutsSetupPanel from '@/components/settings/ShortcutsSetupPanel.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useUiStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import { PhMoon, PhSun, PhSignOut, PhTarget, PhTable, PhGithubLogo, PhRocketLaunch, PhBroom, PhCalendar, PhTelegramLogo, PhSquaresFour } from '@phosphor-icons/vue'
import { supabase } from '@/lib/supabase'
import { initialsFromString, gradientFromString } from '@/lib/color'

const auth = useAuthStore()
const integrations = useIntegrationsStore()
const googleCalendar = useGoogleCalendarStore()
const telegram = useTelegramStore()
const gmail = useGmailStore()
const capture = useCaptureStore()
const notifications = useNotificationsStore()
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

async function updateCalendarToggle(
  key: 'sync_tasks' | 'sync_exams' | 'sync_focus_sessions',
  value: boolean
) {
  savingCalendarSettings.value = true
  await run(() => googleCalendar.updateSettings({ [key]: value }), { successMessage: 'Calendar settings saved' })
  savingCalendarSettings.value = false
}

async function updateTravelBuffer(value: number) {
  savingCalendarSettings.value = true
  await run(
    () => googleCalendar.updateSettings({ travel_buffer_mins: value }),
    { successMessage: 'Calendar settings saved' }
  )
  savingCalendarSettings.value = false
}

async function syncVercelDeploys() {
  await run(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')
    const res = await fetch('/api/vercel/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Deploy sync failed')
    return body
  }, { successMessage: 'Vercel deploys checked' })
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

async function enableWebPush() {
  await run(() => notifications.subscribePush(), { successMessage: 'Web push enabled' })
}

async function runNotificationChecks() {
  await run(() => notifications.runChecks(), { successMessage: 'Notifications checked' })
}

async function syncTelegramTimezone() {
  await telegram.syncTimePrefs().catch(() => {})
}

async function connectTelegram() {
  await run(() => telegram.connect(), { successMessage: 'Open Telegram and tap Start' })
  await syncTelegramTimezone()
}

async function disconnectTelegram() {
  await run(async () => {
    await telegram.disconnect()
    await integrations.fetchStatuses()
  }, { successMessage: 'Telegram disconnected' })
}

function openTelegramLink() {
  if (telegram.linkUrl) window.open(telegram.linkUrl, '_blank', 'noopener,noreferrer')
}

async function disconnectIntegration(provider: 'github' | 'vercel') {
  await run(() => integrations.disconnect(provider), { successMessage: 'Disconnected' })
}

onMounted(async () => {
  await Promise.all([
    integrations.fetchStatuses().catch(() => {}),
    googleCalendar.loadStatus().catch(() => {}),
    telegram.fetchStatus().catch(() => {}),
    gmail.loadStatus().catch(() => {}),
    capture.fetchTokens().catch(() => {}),
    notifications.fetchEvents().catch(() => {}),
  ])

  await syncTelegramTimezone()

  const gmailStatus = route.query.gmail
  if (gmailStatus === 'connected') {
    try {
      await gmail.loadStatus()
      if (gmail.connected) {
        ui.showToast(gmail.email ? `Gmail connected — ${gmail.email}` : 'Gmail connected', 'success')
      } else {
        ui.showToast(
          'Google authorized, but Nexus could not save Gmail. Run migration v12_gmail_provider.sql in Supabase, then Connect again.',
          'error'
        )
      }
    } catch {
      ui.showToast('Could not verify Gmail status. Make sure you are logged in, then try Connect again.', 'error')
    }
    router.replace({ query: {} })
  } else if (gmailStatus === 'error') {
    const message = typeof route.query.message === 'string' ? route.query.message : 'Gmail connection failed'
    ui.showToast(message, 'error')
    router.replace({ query: {} })
  }

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
        <IOSListItem
          title="This Week"
          subtitle="Smart weekly plan with focus block suggestions"
          @click="router.push('/weekly-plan')"
        >
          <template #icon>
            <PhCalendar :size="22" class="text-[var(--color-system-purple)]" weight="fill" />
          </template>
        </IOSListItem>
        <IOSListItem title="Dev Kanban" subtitle="SDLC board — backlog to done" @click="router.push('/kanban')">
          <template #icon>
            <PhSquaresFour :size="22" class="text-[var(--color-system-green)]" weight="fill" />
          </template>
        </IOSListItem>
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
        <IOSListItem
          title="GitHub Issues"
          :subtitle="integrations.githubConnected ? 'Sync open issues into tasks' : 'Connect GitHub first'"
          @click="router.push('/github-issues')"
        >
          <template #icon>
            <PhGithubLogo :size="22" class="text-primary" weight="fill" />
          </template>
        </IOSListItem>
        <IOSListItem
          title="My Schedule"
          :subtitle="googleCalendar.connected ? 'Full calendar in Nexus — today + 2 weeks' : 'Connect to see Google events here'"
          @click="router.push('/google-calendar')"
        >
          <template #icon>
            <PhCalendar :size="22" class="text-[var(--color-system-red)]" weight="fill" />
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
          <IOSButton variant="plain" size="sm" @click="router.push('/github-issues')">
            Sync GitHub Issues → Tasks
          </IOSButton>
          <IOSButton variant="plain" size="sm" @click="router.push('/github-prs')">
            Sync GitHub PRs → Review
          </IOSButton>
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
          <IOSButton
            v-if="integrations.vercelConnected"
            variant="plain"
            size="sm"
            class="mt-2"
            @click="syncVercelDeploys"
          >
            Check failed deploys
          </IOSButton>
        </div>

        <IOSListItem
          title="Google Calendar"
          :subtitle="googleCalendar.connected ? `Connected as ${googleCalendar.email ?? 'Google account'}` : 'Sync exams & task due dates to Google Calendar'"
          @click="googleCalendar.connected && router.push('/google-calendar')"
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
          <IOSListItem title="Export focus sessions" subtitle="Log completed focus time to Google Calendar" @click.prevent>
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="googleCalendar.settings.sync_focus_sessions === true"
                  label="Export focus sessions"
                  :disabled="savingCalendarSettings"
                  @update:model-value="updateCalendarToggle('sync_focus_sessions', $event)"
                />
              </div>
            </template>
          </IOSListItem>
          <div class="px-4 py-2">
            <label class="text-section-header">Travel buffer (minutes)</label>
            <input
              type="number"
              min="0"
              max="60"
              class="mt-1 w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none"
              :value="googleCalendar.settings.travel_buffer_mins ?? 0"
              @change="updateTravelBuffer(parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
          <IOSButton variant="plain" size="sm" class="text-system-red" @click="disconnectGoogleCalendar">
            Disconnect Google Calendar
          </IOSButton>
        </div>

        <IOSListItem
          title="Telegram"
          :subtitle="telegram.connected ? `Linked — ${telegram.displayName ?? 'chat'}` : 'Quick capture: task & note from Telegram'"
        >
          <template #icon>
            <PhTelegramLogo :size="22" class="text-[var(--color-system-blue)]" weight="fill" />
          </template>
          <template #trailing>
            <div class="flex gap-2" @click.stop>
              <IOSButton v-if="!telegram.connected" size="sm" :loading="telegram.connecting" @click="connectTelegram">
                Connect
              </IOSButton>
              <IOSButton v-else size="sm" variant="bordered" @click="connectTelegram">
                Re-link
              </IOSButton>
            </div>
          </template>
        </IOSListItem>

        <div v-if="telegram.connected || telegram.linkUrl" class="space-y-2 px-4 py-2">
          <p class="text-caption-1 text-tertiary">
            Send <code class="text-footnote">task Buy milk tomorrow</code>, <code class="text-footnote">plan</code> for a daily summary, or <code class="text-footnote">deploy</code>
          </p>
          <IOSListItem v-if="telegram.connected" title="Deploy failure alerts" subtitle="Telegram ping when Vercel deploy fails" @click.prevent>
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="telegram.notifications.alert_deploy_fail"
                  label="Deploy failure alerts"
                  @update:model-value="run(() => telegram.updateNotifications({ alert_deploy_fail: $event }))"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSButton v-if="telegram.linkUrl" size="sm" variant="bordered" @click="openTelegramLink">
            Open Telegram bot
          </IOSButton>
          <IOSButton v-if="telegram.connected" variant="plain" size="sm" class="text-system-red" @click="disconnectTelegram">
            Disconnect Telegram
          </IOSButton>
        </div>

        <GmailCapturePanel />
      </IOSListGroup>

      <IOSListGroup title="Apple Shortcuts & capture">
        <ShortcutsSetupPanel />
      </IOSListGroup>

      <IOSListGroup title="Notifications">
        <IOSListItem title="Web push" subtitle="Alerts when Telegram is not connected">
          <template #trailing>
            <IOSButton size="sm" variant="bordered" @click="enableWebPush">Enable</IOSButton>
          </template>
        </IOSListItem>
        <IOSListItem
          title="Notification inbox"
          :subtitle="`${notifications.unreadCount} unread · exam, streak, PR, Gmail alerts`"
        >
          <template #trailing>
            <IOSButton size="sm" variant="bordered" @click="runNotificationChecks">Check now</IOSButton>
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
