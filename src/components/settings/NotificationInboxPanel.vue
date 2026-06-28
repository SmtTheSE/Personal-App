<script setup lang="ts">
import { ref } from 'vue'
import { format, parseISO } from 'date-fns'
import { useNotificationsStore } from '@/stores/notifications'
import { useAsyncAction } from '@/composables/useAsyncAction'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhBell, PhEnvelopeSimple } from '@phosphor-icons/vue'

const notifications = useNotificationsStore()
const { run } = useAsyncAction()
const expandedId = ref<string | null>(null)

function formatWhen(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, h:mm a')
  } catch {
    return iso
  }
}

function emailContent(event: { body: string; payload: Record<string, unknown> }) {
  const fromPayload = typeof event.payload.content === 'string' ? event.payload.content : ''
  return fromPayload || event.body
}

function senderLine(event: { body: string; payload: Record<string, unknown> }) {
  if (typeof event.payload.from === 'string') return event.payload.from
  return event.body.split('\n')[0] ?? ''
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
  if (expandedId.value === id) void notifications.markRead(id)
}

async function markAllRead() {
  await run(() => notifications.markAllRead(), { successMessage: 'All notifications read' })
}
</script>

<template>
  <div v-if="notifications.events.length" class="space-y-2 px-4 py-2">
    <div class="flex items-center justify-between">
      <p class="text-section-header">Recent alerts</p>
      <IOSButton v-if="notifications.unreadCount" size="sm" variant="plain" @click="markAllRead">
        Mark all read
      </IOSButton>
    </div>
    <ul class="space-y-2">
      <li
        v-for="event in notifications.events.slice(0, 20)"
        :key="event.id"
        class="surface-elevated rounded-xl p-3"
        :class="{ 'ring-1 ring-system-blue/30': !event.read_at }"
      >
        <button type="button" class="w-full text-left" @click="toggleExpand(event.id)">
          <div class="flex items-start gap-2">
            <PhEnvelopeSimple
              v-if="event.event_type === 'gmail_alert'"
              :size="18"
              class="mt-0.5 shrink-0 text-system-red"
              weight="fill"
            />
            <PhBell v-else :size="18" class="mt-0.5 shrink-0 text-system-orange" weight="fill" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-primary">{{ event.title }}</p>
              <p v-if="event.event_type === 'gmail_alert'" class="mt-1 text-caption-1 text-tertiary">
                {{ senderLine(event) }}
              </p>
              <p v-else class="mt-1 text-caption-1 text-tertiary line-clamp-2">{{ event.body }}</p>
              <p class="mt-1 text-caption-2 text-tertiary">{{ formatWhen(event.created_at) }}</p>
            </div>
          </div>
        </button>
        <div
          v-if="expandedId === event.id && event.event_type === 'gmail_alert'"
          class="mt-3 max-h-72 overflow-y-auto rounded-xl fill-tertiary p-3"
        >
          <p class="text-caption-1 font-medium text-secondary">Subject</p>
          <p class="mt-1 text-footnote text-primary">{{ event.payload.subject ?? event.title }}</p>
          <p class="mt-3 text-caption-1 font-medium text-secondary">Message</p>
          <p class="mt-1 whitespace-pre-wrap text-footnote text-primary">{{ emailContent(event) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
