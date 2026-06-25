<script setup lang="ts">
import { ref } from 'vue'
import { useInterviewStore } from '@/stores/analytics'
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
import { PhPlus, PhCheckCircle, PhLink, PhCode } from '@phosphor-icons/vue'
import type { ProblemDifficulty } from '@/types'

const interviewStore = useInterviewStore()

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
  await interviewStore.createProblem({
    title: title.value.trim(),
    difficulty: difficulty.value,
    platform: platform.value || undefined,
    url: url.value || undefined,
    topics: topics.value ? topics.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
    notes: notes.value || undefined,
  })
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

    <div class="space-y-4 px-4 py-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="surface-elevated p-3 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 font-bold text-system-green">{{ interviewStore.solvedCount }}</p>
          <p class="text-caption-1 text-tertiary">Solved</p>
        </div>
        <div class="surface-elevated p-3 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 font-bold text-system-orange">{{ interviewStore.dueForRevisit.length }}</p>
          <p class="text-caption-1 text-tertiary">To Revisit</p>
        </div>
      </div>

      <IOSListGroup v-if="interviewStore.filteredProblems.length" :inset="false">
        <IOSListItem
          v-for="problem in interviewStore.filteredProblems"
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
                @click.stop="interviewStore.markSolved(problem.id)"
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
        v-else
        title="No problems tracked"
        subtitle="Log LeetCode-style problems with spaced repetition"
        :icon="PhCode"
      >
        <IOSButton @click="showSheet = true">Add Problem</IOSButton>
      </IOSEmptyState>
    </div>

    <IOSSheet :open="showSheet" title="Add Problem" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="title" label="Title" placeholder="Two Sum" clearable />
        <IOSTextField v-model="platform" label="Platform" placeholder="LeetCode" />
        <IOSTextField v-model="url" label="URL" placeholder="https://leetcode.com/..." />
        <div class="space-y-2">
          <label class="text-section-header px-1">Difficulty</label>
          <div class="flex gap-2">
            <IOSChip
              v-for="d in difficulties"
              :key="d"
              :label="d"
              :color="difficultyColors[d]"
              :selected="difficulty === d"
              class="flex-1"
              @click="difficulty = d"
            />
          </div>
        </div>
        <IOSTextField v-model="topics" label="Topics" placeholder="arrays, hash-map" />
        <IOSTextArea v-model="notes" label="Notes" placeholder="Approach, key insights..." />
        <IOSButton block @click="addProblem">Add Problem</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
