<script setup lang="ts">
import { ref } from 'vue'
import { useInterviewStore } from '@/stores/analytics'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import { PhPlus, PhCheckCircle, PhLink } from '@phosphor-icons/vue'
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

const difficultyColors: Record<ProblemDifficulty, string> = {
  easy: 'bg-ios-green/15 text-ios-green',
  medium: 'bg-ios-orange/15 text-ios-orange',
  hard: 'bg-ios-red/15 text-ios-red',
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
  if (link) window.open(link, '_blank')
}
</script>

<template>
  <div>
    <NavBar title="Interview Prep" large show-back>
      <div class="flex gap-2 px-4 pb-2">
        <button
          type="button"
          class="rounded-full px-3 py-1 ios-caption font-medium transition-colors"
          :class="!interviewStore.filterDifficulty ? 'bg-ios-blue text-white' : 'bg-black/5 dark:bg-white/10'"
          @click="interviewStore.filterDifficulty = null"
        >
          All
        </button>
        <button
          v-for="d in difficulties"
          :key="d"
          type="button"
          class="rounded-full px-3 py-1 ios-caption font-medium capitalize transition-colors"
          :class="interviewStore.filterDifficulty === d ? 'bg-ios-blue text-white' : 'bg-black/5 dark:bg-white/10'"
          @click="interviewStore.filterDifficulty = d"
        >
          {{ d }}
        </button>
      </div>
      <div class="flex justify-end px-4 pb-2">
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-ios-blue text-white" @click="showSheet = true">
          <PhPlus :size="20" weight="bold" />
        </button>
      </div>
    </NavBar>

    <div class="space-y-4 px-4 py-4">
      <div class="flex gap-4">
        <div class="ios-card flex-1 p-3 text-center">
          <p class="text-2xl font-bold text-ios-green">{{ interviewStore.solvedCount }}</p>
          <p class="ios-caption text-ios-tertiary-label">Solved</p>
        </div>
        <div class="ios-card flex-1 p-3 text-center">
          <p class="text-2xl font-bold text-ios-orange">{{ interviewStore.dueForRevisit.length }}</p>
          <p class="ios-caption text-ios-tertiary-label">To Revisit</p>
        </div>
      </div>

      <IOSListGroup v-if="interviewStore.filteredProblems.length">
        <IOSListItem
          v-for="problem in interviewStore.filteredProblems"
          :key="problem.id"
          :title="problem.title"
          :subtitle="problem.platform ?? undefined"
          @click="openUrl(problem.url)"
        >
          <template #trailing>
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 ios-caption font-medium capitalize" :class="difficultyColors[problem.difficulty]">
                {{ problem.difficulty }}
              </span>
              <button
                v-if="!problem.solved_at"
                type="button"
                class="text-ios-green"
                @click.stop="interviewStore.markSolved(problem.id)"
              >
                <PhCheckCircle :size="20" />
              </button>
              <PhCheckCircle v-else :size="20" weight="fill" class="text-ios-green" />
              <PhLink v-if="problem.url" :size="16" class="text-ios-tertiary-label" />
            </div>
          </template>
        </IOSListItem>
      </IOSListGroup>

      <div v-else class="py-16 text-center">
        <p class="ios-subhead text-ios-tertiary-label">No problems tracked</p>
        <IOSButton class="mt-4" @click="showSheet = true">Add a problem</IOSButton>
      </div>
    </div>

    <IOSSheet :open="showSheet" title="Add Problem" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="title" label="Title" placeholder="Two Sum" />
        <IOSTextField v-model="platform" label="Platform" placeholder="LeetCode" />
        <IOSTextField v-model="url" label="URL" placeholder="https://leetcode.com/..." />
        <div class="space-y-1">
          <label class="ios-footnote font-medium uppercase tracking-wide text-ios-tertiary-label px-1">Difficulty</label>
          <div class="flex gap-2">
            <button
              v-for="d in difficulties"
              :key="d"
              type="button"
              class="flex-1 rounded-[10px] py-2 ios-subhead font-medium capitalize"
              :class="difficulty === d ? 'bg-ios-blue text-white' : 'bg-black/5 dark:bg-white/10'"
              @click="difficulty = d"
            >
              {{ d }}
            </button>
          </div>
        </div>
        <IOSTextField v-model="topics" label="Topics" placeholder="arrays, hash-map" />
        <IOSTextArea v-model="notes" label="Notes" placeholder="Approach, key insights..." />
        <IOSButton block @click="addProblem">Add Problem</IOSButton>
      </div>
    </IOSSheet>
  </div>
</template>
