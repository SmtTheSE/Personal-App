<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useScheduleHorizon } from '@/composables/useCalendarWeek'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import DayAgenda from '@/components/calendar/DayAgenda.vue'
import NextUpCard from '@/components/calendar/NextUpCard.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSSkeleton from '@/components/ui/IOSSkeleton.vue'
import { PhCalendar, PhArrowsClockwise, PhGear } from '@phosphor-icons/vue'

const router = useRouter()
const googleCalendar = useGoogleCalendarStore()
const schedule = useScheduleHorizon(14)
const { run } = useAsyncAction()

const daySections = schedule.daySections
const hasAnyEvents = computed(() => daySections.value.some((s) => s.events.length > 0))

function openNextUp() {
  const event = schedule.nextUpEvent.value
  if (!event) return
  if (event.externalUrl) {
    window.open(event.externalUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (event.path) router.push(event.path)
}

async function handleRefresh() {
  await googleCalendar.loadStatus().catch(() => {})
  await schedule.refresh()
  if (googleCalendar.connected) {
    await run(() => googleCalendar.fetchDashboard().catch(() => {}))
  }
}

async function syncNow() {
  await run(() => googleCalendar.syncNow(), { successMessage: 'Synced to Google Calendar' })
  await schedule.refresh()
}

async function toggleSetting(key: 'sync_tasks' | 'sync_exams', value: boolean) {
  await run(() => googleCalendar.updateSettings({ [key]: value }), { successMessage: 'Settings saved' })
}

onMounted(() => {
  void handleRefresh()
})
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar title="My Schedule" large show-back>
        <div class="flex justify-end gap-2 px-4 pb-2">
          <button
            v-if="googleCalendar.connected"
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full fill-tertiary text-system-blue press-scale"
            aria-label="Sync Nexus to Google"
            :disabled="googleCalendar.syncing"
            @click="syncNow"
          >
            <PhArrowsClockwise :size="20" :class="{ 'animate-spin': googleCalendar.syncing }" />
          </button>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full fill-tertiary text-system-blue press-scale"
            aria-label="Settings"
            @click="router.push('/settings')"
          >
            <PhGear :size="20" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 py-4">
      <div
        v-if="!googleCalendar.connected"
        class="surface-elevated mx-4 space-y-3 p-4 text-center"
        :style="{ borderRadius: 'var(--radius-card)' }"
      >
        <PhCalendar :size="40" class="mx-auto text-system-red" weight="fill" />
        <h2 class="text-headline text-primary">See your full schedule here</h2>
        <p class="text-footnote text-tertiary">
          Connect Google Calendar to view classes, meetings, and deadlines in Nexus — no app switching.
        </p>
        <IOSButton block @click="router.push('/settings')">Connect Google Calendar</IOSButton>
      </div>

      <template v-else>
        <p class="px-4 text-footnote text-tertiary">
          {{ googleCalendar.email }} · tasks, exams & Google events in one place
        </p>

        <NextUpCard
          v-if="schedule.nextUpEvent.value"
          :event="schedule.nextUpEvent.value"
          @open="openNextUp"
        />

        <IOSSkeleton v-if="googleCalendar.loading && !daySections.length" class="mx-4" />

        <div v-else class="space-y-8">
          <section v-for="section in daySections" :key="section.label">
            <DayAgenda
              :events="section.events"
              :day="section.day"
              :show-google-badge="section.isToday"
            />
          </section>

          <div
            v-if="!hasAnyEvents"
            class="surface-elevated mx-4 p-4 text-center"
            :style="{ borderRadius: 'var(--radius-card)' }"
          >
            <p class="text-footnote text-tertiary">Nothing on your schedule for the next two weeks.</p>
          </div>
        </div>

        <IOSListGroup title="Google sync" class="px-0">
          <IOSListItem title="Push task due dates to Google" @click.prevent>
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="googleCalendar.settings.sync_tasks !== false"
                  label="Sync tasks"
                  @update:model-value="toggleSetting('sync_tasks', $event)"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSListItem title="Push exams to Google" @click.prevent>
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="googleCalendar.settings.sync_exams !== false"
                  label="Sync exams"
                  @update:model-value="toggleSetting('sync_exams', $event)"
                />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
      </template>
    </div>
  </PageShell>
</template>
