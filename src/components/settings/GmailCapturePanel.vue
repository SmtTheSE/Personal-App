<script setup lang="ts">
import { ref, watch } from 'vue'
import { format, parseISO } from 'date-fns'
import { useGmailStore } from '@/stores/gmail'
import { useUiStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhEnvelopeSimple, PhCheckCircle, PhArrowClockwise } from '@phosphor-icons/vue'

const gmail = useGmailStore()
const ui = useUiStore()
const { run } = useAsyncAction()
const labelDraft = ref(gmail.labelName)

watch(() => gmail.labelName, (v) => { labelDraft.value = v })

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

  <div v-else class="px-4 py-2">
    <p class="text-caption-1 text-tertiary">
      Connect Gmail to import labeled emails as tasks or notes. You’ll see a green check when connected.
    </p>
  </div>
</template>
