<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendarWeek } from '@/composables/useCalendarWeek'
import { useExamsStore } from '@/stores/exams'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import WeekStrip from '@/components/calendar/WeekStrip.vue'
import DayAgenda from '@/components/calendar/DayAgenda.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import { PhPlus } from '@phosphor-icons/vue'
import type { ExamColor } from '@/types'

const router = useRouter()
const examsStore = useExamsStore()
const { run } = useAsyncAction()

const cal = useCalendarWeek()

const showExamSheet = ref(false)
const title = ref('')
const course = ref('')
const examAt = ref('')
const location = ref('')
const color = ref<ExamColor>('blue')

const colors: ExamColor[] = ['blue', 'purple', 'orange', 'red', 'green']

async function handleRefresh() {
  await examsStore.fetchExams()
}

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
        <div class="flex justify-end px-4 pb-2">
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

    <div class="py-4">
      <DayAgenda
        :events="cal.selectedDayEvents.value"
        :day="cal.selectedDay.value"
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
