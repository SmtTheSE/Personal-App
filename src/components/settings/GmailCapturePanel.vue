<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { useGmailStore } from '@/stores/gmail'
import { useNotificationsStore } from '@/stores/notifications'
import { useUiStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { ensureNotificationPermission, playAlertSound, showBrowserAlert } from '@/lib/alertSound'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import { PhEnvelopeSimple, PhCheckCircle, PhArrowClockwise, PhBell } from '@phosphor-icons/vue'

const gmail = useGmailStore()
const notifications = useNotificationsStore()
const ui = useUiStore()
const { run } = useAsyncAction()
const labelDraft = ref(gmail.labelName)
const keywordsDraft = ref(gmail.alertKeywords.join(', '))

watch(() => gmail.labelName, (v) => { labelDraft.value = v })
watch(() => gmail.alertKeywords, (v) => { keywordsDraft.value = v.join(', ') })

const alertSubtitle = computed(() => {
  if (!gmail.alertEnabled) return 'School inbox alerts off'
  return `Alerts: ${gmail.alertKeywords.slice(0, 2).join(', ')}`
})

async function connect() {
  await run(() => gmail.connect())
}

async function syncNow() {
  const stats = await run(() => gmail.sync(), {
    successMessage: `Imported ${gmail.lastSync?.imported ?? 0} item(s) from Gmail`,
  })
  if (stats && stats.errors?.length) {
    ui.showToast(stats.errors[0], 'error')
  }
}

async function saveLabel() {
  if (!labelDraft.value.trim()) return
  await run(() => gmail.updateLabel(labelDraft.value.trim()), { successMessage: 'Label updated' })
}

async function saveAlertKeywords() {
  const keywords = keywordsDraft.value
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (!keywords.length) {
    ui.showToast('Add at least one keyword', 'error')
    return
  }
  await run(() => gmail.updateSettings({ alert_keywords: keywords }), { successMessage: 'Alert keywords saved' })
}

async function toggleAlerts(enabled: boolean) {
  if (enabled) await ensureNotificationPermission()
  await run(() => gmail.updateSettings({ alert_enabled: enabled }), {
    successMessage: enabled ? 'School inbox alerts on' : 'School inbox alerts off',
  })
}

async function testAlerts() {
  const stats = await run(() => gmail.checkAlerts(), {
    successMessage: 'Inbox checked for school mail',
  })
  await notifications.fetchEvents()
  const fresh = notifications.events.filter((e) => e.event_type === 'gmail_alert' && !e.read_at)
  if (stats && stats.notified > 0 && fresh.length) {
    playAlertSound()
    showBrowserAlert(fresh[0].title, fresh[0].body.split('\n')[0] ?? fresh[0].body)
    ui.showToast(`${stats.notified} new school email(s) — check Telegram & notifications`, 'success')
  }
}

async function disconnect() {
  await run(() => gmail.disconnect(), { successMessage: 'Gmail disconnected' })
}

function formatWhen(iso: string | null) {
  if (!iso) return 'Never'
  try {
    return format(parseISO(iso), 'MMM d, h:mm a')
  } catch {
    return iso
  }
}
</script>

<template>
  <IOSListItem
    title="Gmail capture"
    :subtitle="gmail.statusLabel"
  >
    <template #icon>
      <PhEnvelopeSimple :size="22" class="text-system-red" weight="fill" />
    </template>
    <template #trailing>
      <div class="flex items-center gap-2" @click.stop>
        <PhCheckCircle v-if="gmail.connected" :size="20" class="text-system-green" weight="fill" />
        <IOSButton v-if="!gmail.connected" size="sm" :loading="gmail.loading" @click="connect">
          Connect
        </IOSButton>
        <IOSButton v-else size="sm" variant="bordered" :loading="gmail.syncing" @click="syncNow">
          <PhArrowClockwise :size="14" class="mr-1 inline" />
          Import
        </IOSButton>
      </div>
    </template>
  </IOSListItem>

  <div v-if="gmail.connected" class="space-y-3 px-4 py-2">
    <div class="surface-elevated rounded-2xl p-3 text-footnote">
      <p class="font-medium text-primary">How it works</p>
      <ol class="mt-2 list-decimal space-y-1 pl-4 text-tertiary">
        <li>In Gmail, create label <code class="text-primary">{{ gmail.labelName }}</code></li>
        <li>Apply it to emails you want as Nexus tasks</li>
        <li>Subject tips: <code>Buy milk [2026-07-01]</code> or prefix <code>[note]</code></li>
        <li>Tap <strong>Import</strong> here to pull labeled mail into Nexus</li>
      </ol>
    </div>

    <div class="surface-elevated rounded-2xl p-3 text-footnote">
      <div class="flex items-center gap-2">
        <PhBell :size="18" class="text-system-orange" weight="fill" />
        <p class="font-medium text-primary">School inbox alerts</p>
      </div>
      <p class="mt-2 text-tertiary">
        Get a sound alert in Nexus and a Telegram ping when matching mail hits your inbox.
        Checks run while the app is open (every minute) and when you return to the tab.
      </p>
      <IOSListItem
        class="mt-2 !px-0"
        title="Enable school alerts"
        :subtitle="alertSubtitle"
        @click.prevent
      >
        <template #trailing>
          <div @click.stop>
            <IOSSwitch
              :model-value="gmail.alertEnabled"
              label="Enable school inbox alerts"
              @update:model-value="toggleAlerts"
            />
          </div>
        </template>
      </IOSListItem>
      <div v-if="gmail.alertEnabled" class="mt-3 space-y-2">
        <label class="text-section-header">Keywords (comma-separated)</label>
        <div class="flex gap-2">
          <input
            v-model="keywordsDraft"
            type="text"
            class="min-w-0 flex-1 rounded-[10px] fill-tertiary px-4 py-2 text-body text-primary outline-none"
            placeholder="@sbsedu.vn, @sbsuni.edu.vn"
          />
          <IOSButton size="sm" variant="bordered" @click="saveAlertKeywords">Save</IOSButton>
        </div>
        <p class="text-caption-1 text-tertiary">
          Use <code>@sbsedu.vn</code> and <code>@sbsuni.edu.vn</code> to match all SBS senders (Student Services, Finance, Registrar, etc.).
        </p>
        <IOSButton size="sm" variant="bordered" @click="testAlerts">Check inbox now</IOSButton>
        <p v-if="gmail.lastAlertCheckAt" class="text-caption-1 text-tertiary">
          Last checked {{ formatWhen(gmail.lastAlertCheckAt) }}
          <span v-if="gmail.lastAlertStats"> · {{ gmail.lastAlertStats.notified }} notified</span>
        </p>
      </div>
    </div>

    <div>
      <label class="text-section-header">Gmail label name</label>
      <div class="mt-1 flex gap-2">
        <input
          v-model="labelDraft"
          type="text"
          class="min-w-0 flex-1 rounded-[10px] fill-tertiary px-4 py-2 text-body text-primary outline-none"
          placeholder="nexus/task"
        />
        <IOSButton size="sm" variant="bordered" @click="saveLabel">Save</IOSButton>
      </div>
    </div>

    <div v-if="gmail.lastSync" class="surface-elevated rounded-2xl p-3 text-footnote">
      <p class="font-medium text-primary">Last import · {{ formatWhen(gmail.lastSyncAt) }}</p>
      <p class="mt-1 text-tertiary">
        {{ gmail.lastSync.imported }} imported · {{ gmail.lastSync.skipped }} skipped
      </p>
      <p v-if="gmail.lastSync.errors.length" class="mt-1 text-system-red">
        {{ gmail.lastSync.errors[0] }}
      </p>
    </div>
    <p v-else class="text-caption-1 text-tertiary">
      Connected {{ formatWhen(gmail.connectedAt) }} — no import yet
    </p>

    <IOSButton variant="plain" size="sm" class="text-system-red" @click="disconnect">
      Disconnect Gmail
    </IOSButton>
  </div>

  <div v-else class="space-y-2 px-4 py-2">
    <p class="text-caption-1 text-tertiary">
      Connect Gmail to import labeled emails as tasks or notes. You’ll see a green check when connected.
    </p>
    <p v-if="gmail.loadError" class="text-caption-1 text-system-red">{{ gmail.loadError }}</p>
    <p class="text-caption-1 text-tertiary">
      If Google sign-in finishes but status stays “Not connected”, run
      <code class="text-footnote">v12_gmail_provider.sql</code> in Supabase SQL editor, then tap Connect again.
    </p>
  </div>
</template>
