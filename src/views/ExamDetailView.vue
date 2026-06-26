<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useExamsStore } from '@/stores/exams'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSRingProgress from '@/components/ui/IOSRingProgress.vue'
import { PhCheckCircle, PhPlus, PhExam, PhMapPin } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const examsStore = useExamsStore()
const { run } = useAsyncAction()

const examId = computed(() => route.params.id as string)
const exam = computed(() => examsStore.getExamById(examId.value))
const prepItems = computed(() => (exam.value ? examsStore.prepForExam(exam.value.id) : []))
const progress = computed(() => (exam.value ? examsStore.prepProgress(exam.value.id) : 0))
const daysLeft = computed(() => (exam.value ? examsStore.daysUntil(exam.value) : 0))

const newPrep = ref('')

onMounted(async () => {
  if (!examsStore.exams.length) await examsStore.fetchExams()
})

async function togglePrep(id: string) {
  await run(() => examsStore.togglePrepItem(id), { successMessage: 'Updated' })
}

async function addPrep() {
  if (!exam.value || !newPrep.value.trim()) return
  const result = await run(
    () => examsStore.createPrepItem(exam.value!.id, newPrep.value.trim()),
    { successMessage: 'Item added' }
  )
  if (result) newPrep.value = ''
}

async function deleteExam() {
  if (!exam.value) return
  const id = exam.value.id
  const ok = await run(async () => { await examsStore.deleteExam(id); return true }, { successMessage: 'Exam deleted' })
  if (ok) router.push('/calendar')
}
</script>

<template>
  <PageShell v-if="exam">
    <template #header>
      <NavBar :title="exam.title" show-back />
    </template>

    <div class="space-y-6 px-4 py-4">
      <div class="surface-elevated flex items-center gap-4 p-4" :style="{ borderRadius: 'var(--radius-card)' }">
        <IOSRingProgress :value="progress" :max="100" :size="80" :stroke-width="8" label="ready" />
        <div class="min-w-0 flex-1">
          <p class="text-caption-1 font-semibold text-system-orange">
            {{ daysLeft === 0 ? 'Exam is today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left` }}
          </p>
          <h2 class="text-title-2 text-primary">{{ exam.course || exam.title }}</h2>
          <p class="text-footnote text-tertiary">{{ format(new Date(exam.exam_at), 'EEEE, MMM d · h:mm a') }}</p>
          <p v-if="exam.location" class="text-caption-1 mt-1 flex items-center gap-1 text-secondary">
            <PhMapPin :size="12" /> {{ exam.location }}
          </p>
        </div>
      </div>

      <IOSListGroup title="Prep Checklist">
        <IOSListItem
          v-for="item in prepItems"
          :key="item.id"
          :title="item.title"
          :class="item.completed ? 'opacity-60' : ''"
          @click="togglePrep(item.id)"
        >
          <template #icon>
            <div
              class="flex h-6 w-6 items-center justify-center rounded-full border-2"
              :class="item.completed ? 'border-system-green bg-system-green' : 'border-tertiary'"
            >
              <PhCheckCircle v-if="item.completed" :size="14" weight="fill" class="text-white" />
            </div>
          </template>
        </IOSListItem>
        <div class="flex items-center gap-2 px-4 py-2">
          <IOSTextField v-model="newPrep" placeholder="Add prep item..." class="flex-1" />
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Add item"
            @click="addPrep"
          >
            <PhPlus :size="18" weight="bold" />
          </button>
        </div>
      </IOSListGroup>

      <IOSButton variant="destructive" block @click="deleteExam">Delete Exam</IOSButton>
    </div>
  </PageShell>

  <div v-else class="flex min-h-[50vh] flex-col items-center justify-center gap-2">
    <PhExam :size="40" class="text-tertiary" />
    <p class="text-subheadline text-tertiary">Loading exam…</p>
  </div>
</template>
