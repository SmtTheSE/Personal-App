<script setup lang="ts">
import { ref } from 'vue'
import { format } from 'date-fns'
import { useInterviewStore } from '@/stores/analytics'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useHaptics } from '@/composables/useHaptics'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import { PhPlus, PhCheckCircle, PhLink, PhCode, PhBrain, PhThumbsUp, PhArrowCounterClockwise } from '@phosphor-icons/vue'
import type { ProblemDifficulty } from '@/types'

const interviewStore = useInterviewStore()
const { run } = useAsyncAction()
const { trigger } = useHaptics()

const showSheet = ref(false)
const title = ref('')
const difficulty = ref<ProblemDifficulty>('medium')
const platform = ref('')
const url = ref('')
const topics = ref('')
const notes = ref('')

const difficulties: ProblemDifficulty[] = ['easy', 'medium', 'hard']

const difficultyColors: Record<ProblemDifficulty, 'green' | 'orange' | 'red'> = {
  easy: 'green',
  medium: 'orange',
  hard: 'red',
}

async function addProblem() {
  if (!title.value.trim()) return
  const result = await run(
    () =>
      interviewStore.createProblem({
        title: title.value.trim(),
        difficulty: difficulty.value,
        platform: platform.value || undefined,
        url: url.value || undefined,
        topics: topics.value ? topics.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
        notes: notes.value || undefined,
      }),
    { successMessage: 'Problem added' }
  )
  if (!result) return
  title.value = ''
  platform.value = ''
  url.value = ''
  topics.value = ''
  notes.value = ''
  showSheet.value = false
}

function openUrl(link: string | null) {
  if (link) window.open(link, '_blank', 'noopener')
}

async function markSolved(id: string) {
  await run(() => interviewStore.markSolved(id), { successMessage: 'Scheduled for review' })
  trigger('success')
}

async function review(id: string, remembered: boolean) {
  await run(
    () => interviewStore.recordReview(id, remembered),
    { successMessage: remembered ? 'Interval increased' : 'Review again soon' }
  )
  trigger(remembered ? 'success' : 'light')
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Interview Prep" large show-back>
        <div class="flex gap-2 px-4 pb-2">
          <IOSChip label="All" :selected="!interviewStore.filterDifficulty" @click="interviewStore.filterDifficulty = null" />
          <IOSChip
            v-for="d in difficulties"
            :key="d"
            :label="d"
            :color="difficultyColors[d]"
            :selected="interviewStore.filterDifficulty === d"
            @click="interviewStore.filterDifficulty = d"
          />
        </div>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Add problem"
            @click="showSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 px-4 py-4">
      <div class="grid grid-cols-3 gap-2">
        <div class="surface-elevated p-3 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 font-bold text-system-green">{{ interviewStore.solvedCount }}</p>
          <p class="text-caption-2 text-tertiary">Solved</p>
        </div>
        <div class="surface-elevated p-3 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 font-bold text-system-orange">{{ interviewStore.reviewQueue.length }}</p>
          <p class="text-caption-2 text-tertiary">Due today</p>
        </div>
        <div class="surface-elevated p-3 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 font-bold text-system-blue">{{ interviewStore.problems.length }}</p>
          <p class="text-caption-2 text-tertiary">Total</p>
        </div>
      </div>

      <section v-if="interviewStore.reviewQueue.length">
        <div class="mb-2 flex items-center gap-2 px-1">
          <PhBrain :size="18" class="text-system-orange" weight="fill" />
          <h2 class="text-title-3 text-primary">Review Queue</h2>
        </div>
        <p class="text-footnote mb-3 px-1 text-tertiary">Spaced repetition — 1d → 3d → 7d → 14d → 30d</p>
        <IOSListGroup :inset="false">
          <div
            v-for="problem in interviewStore.reviewQueue"
            :key="problem.id"
            class="border-b border-[var(--color-separator)] px-4 py-3 last:border-b-0"
          >
            <div class="flex items-start justify-between gap-2">
              <button type="button" class="min-w-0 flex-1 text-left" @click="openUrl(problem.url)">
                <p class="text-body font-medium text-primary">{{ problem.title }}</p>
                <p class="text-caption-1 text-tertiary">
                  {{ problem.platform }} · {{ problem.next_review_at ? format(new Date(problem.next_review_at), 'MMM d') : 'Due' }}
                </p>
              </button>
              <IOSChip :label="problem.difficulty" :color="difficultyColors[problem.difficulty]" selected />
            </div>
            <div class="mt-3 flex gap-2">
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-system-green/15 py-2.5 text-caption-1 font-medium text-system-green press-scale"
                @click="review(problem.id, true)"
              >
                <PhThumbsUp :size="16" weight="fill" />
                Got it
              </button>
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-system-orange/15 py-2.5 text-caption-1 font-medium text-system-orange press-scale"
                @click="review(problem.id, false)"
              >
                <PhArrowCounterClockwise :size="16" weight="fill" />
                Again
              </button>
            </div>
          </div>
        </IOSListGroup>
      </section>

      <section>
        <h2 class="text-title-3 mb-2 px-1 text-primary">All Problems</h2>
        <IOSListGroup v-if="interviewStore.otherProblems.length" :inset="false">
          <IOSListItem
            v-for="problem in interviewStore.otherProblems"
            :key="problem.id"
            :title="problem.title"
            :subtitle="problem.platform ?? undefined"
            @click="openUrl(problem.url)"
          >
            <template #trailing>
              <div class="flex items-center gap-2">
                <IOSChip :label="problem.difficulty" :color="difficultyColors[problem.difficulty]" selected />
                <button
                  v-if="!problem.solved_at"
                  type="button"
                  class="text-system-green press-scale"
                  aria-label="Mark solved"
                  @click.stop="markSolved(problem.id)"
                >
                  <PhCheckCircle :size="20" />
                </button>
                <PhCheckCircle v-else :size="20" weight="fill" class="text-system-green" />
                <PhLink v-if="problem.url" :size="16" class="text-tertiary" />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
        <IOSEmptyState
          v-else-if="!interviewStore.reviewQueue.length"
          title="No problems tracked"
          subtitle="Log LeetCode-style problems with spaced repetition"
          :icon="PhCode"
        >
          <IOSButton @click="showSheet = true">Add Problem</IOSButton>
        </IOSEmptyState>
      </section>
    </div>

    <IOSSheet :open="showSheet" title="Add Problem" @close="showSheet = false">
      <div class="space-y-4 px-4 pb-6">
        <IOSTextField v-model="title" label="Title" placeholder="Two Sum" />
        <IOSTextField v-model="platform" label="Platform" placeholder="LeetCode" />
        <IOSTextField v-model="url" label="URL" placeholder="https://leetcode.com/..." />
        <div class="flex gap-2">
          <IOSChip v-for="d in difficulties" :key="d" :label="d" :color="difficultyColors[d]" :selected="difficulty === d" @click="difficulty = d" />
        </div>
        <IOSTextField v-model="topics" label="Topics" placeholder="arrays, hash-map" />
        <IOSTextArea v-model="notes" label="Notes" placeholder="Approach, key insights..." />
        <IOSButton block @click="addProblem">Add Problem</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
