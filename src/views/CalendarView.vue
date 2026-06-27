<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { isSameDay } from 'date-fns'
import { useRouter } from 'vue-router'
import { useCalendarWeek } from '@/composables/useCalendarWeek'
import { useExamsStore } from '@/stores/exams'
import { useTasksStore } from '@/stores/tasks'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import WeekStrip from '@/components/calendar/WeekStrip.vue'
import DayAgenda from '@/components/calendar/DayAgenda.vue'
import NextUpCard from '@/components/calendar/NextUpCard.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import { PhPlus, PhCalendar } from '@phosphor-icons/vue'
import type { ExamColor } from '@/types'

const router = useRouter()
const examsStore = useExamsStore()
const tasksStore = useTasksStore()
const googleCalendar = useGoogleCalendarStore()
const { run } = useAsyncAction()

const cal = useCalendarWeek()

const showExamSheet = ref(false)
const title = ref('')
const course = ref('')
const examAt = ref('')
const location = ref('')
const color = ref<ExamColor>('blue')

const colors: ExamColor[] = ['blue', 'purple', 'orange', 'red', 'green']

const showNextUp = computed(
  () => cal.nextUpEvent.value && isSameDay(cal.selectedDay.value, new Date())
)

function openNextUp() {
  const event = cal.nextUpEvent.value
  if (!event) return
  if (event.externalUrl) {
    window.open(event.externalUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (event.path) router.push(event.path)
}

async function handleRefresh() {
  await Promise.all([
    tasksStore.fetchTasks(),
    examsStore.fetchExams(),
    cal.refreshGoogleEvents(),
  ])
}

onMounted(() => {
  void googleCalendar.loadStatus().then(() => cal.refreshGoogleEvents())
})

async function addExam() {
  if (!title.value.trim() || !examAt.value) return
  const result = await run(
    () =>
      examsStore.createExam({
        title: title.value.trim(),
        course: course.value || undefined,
        exam_at: new Date(examAt.value).toISOString(),
        location: location.value || undefined,
        color: color.value,
      }),
    { successMessage: 'Exam added' }
  )
  if (!result) return
  title.value = ''
  course.value = ''
  examAt.value = ''
  location.value = ''
  showExamSheet.value = false
  router.push(`/exams/${result.id}`)
}
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar title="Calendar" large show-search>
        <WeekStrip
          :days="cal.weekDays.value"
          :selected-day="cal.selectedDay.value"
          :week-label="cal.weekLabel.value"
          :event-count="cal.eventCountForDay"
          @select="cal.selectDay"
          @prev="cal.prevWeek"
          @next="cal.nextWeek"
          @today="cal.goToday"
        />
        <div class="flex justify-end gap-2 px-4 pb-2">
          <button
            type="button"
            class="flex h-11 items-center gap-2 rounded-full px-4 text-caption-1 font-medium press-scale"
            :class="googleCalendar.connected ? 'fill-tertiary text-system-blue' : 'fill-tertiary text-tertiary'"
            @click="router.push('/google-calendar')"
          >
            <PhCalendar :size="18" weight="fill" />
            {{ googleCalendar.connected ? 'Full schedule' : 'Connect Google' }}
          </button>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Add exam"
            @click="showExamSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <NextUpCard
      v-if="showNextUp"
      :event="cal.nextUpEvent.value!"
      @open="openNextUp"
    />

    <div class="py-4">
      <DayAgenda
        :events="cal.selectedDayEvents.value"
        :day="cal.selectedDay.value"
        show-google-badge
      />
    </div>

    <IOSSheet :open="showExamSheet" title="New Exam" @close="showExamSheet = false">
      <div class="space-y-4 px-4 pb-6">
        <IOSTextField v-model="title" label="Exam title" placeholder="Midterm" />
        <IOSTextField v-model="course" label="Course" placeholder="CS101" />
        <IOSTextField v-model="examAt" label="Date & time" type="datetime-local" />
        <IOSTextField v-model="location" label="Location" placeholder="Room 204" />
        <div class="flex flex-wrap gap-2">
          <IOSChip v-for="c in colors" :key="c" :label="c" :selected="color === c" @click="color = c" />
        </div>
        <IOSButton block @click="addExam">Create with Prep Checklist</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
