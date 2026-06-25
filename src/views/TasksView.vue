<script setup lang="ts">
import { ref } from 'vue'
import { format, parseISO } from 'date-fns'
import { useTasksStore } from '@/stores/tasks'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { PhPlus, PhTrash, PhCheckCircle } from '@phosphor-icons/vue'
import type { TaskPriority } from '@/types'

const tasksStore = useTasksStore()

const showSheet = ref(false)
const newTitle = ref('')
const newPriority = ref<TaskPriority>('medium')
const newDueDate = ref('')

async function addTask() {
  if (!newTitle.value.trim()) return
  await tasksStore.createTask({
    title: newTitle.value.trim(),
    priority: newPriority.value,
    due_date: newDueDate.value || undefined,
  })
  newTitle.value = ''
  newPriority.value = 'medium'
  newDueDate.value = ''
  showSheet.value = false
}

async function toggleTask(id: string) {
  await tasksStore.toggleComplete(id)
  if (navigator.vibrate) navigator.vibrate(10)
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-ios-green',
  medium: 'text-ios-orange',
  high: 'text-ios-red',
}
</script>

<template>
  <div>
    <NavBar title="Tasks" large>
      <div class="flex justify-end px-4 pb-2">
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-ios-blue text-white" @click="showSheet = true">
          <PhPlus :size="20" weight="bold" />
        </button>
      </div>
    </NavBar>

    <div class="space-y-6 px-4 py-4">
      <section v-if="tasksStore.pendingTasks.length">
        <p class="ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide text-ios-tertiary-label">
          To Do · {{ tasksStore.pendingTasks.length }}
        </p>
        <IOSListGroup>
          <IOSListItem
            v-for="task in tasksStore.pendingTasks"
            :key="task.id"
            :title="task.title"
            @click="toggleTask(task.id)"
          >
            <template #icon>
              <div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ios-tertiary-label" />
            </template>
            <template #trailing>
              <div class="flex items-center gap-2">
                <span class="ios-caption font-medium capitalize" :class="priorityColors[task.priority]">
                  {{ task.priority }}
                </span>
                <span v-if="task.due_date" class="ios-caption text-ios-tertiary-label">
                  {{ format(parseISO(task.due_date), 'MMM d') }}
                </span>
                <button
                  type="button"
                  class="p-1 text-ios-red"
                  @click.stop="tasksStore.deleteTask(task.id)"
                >
                  <PhTrash :size="16" />
                </button>
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
      </section>

      <section v-if="tasksStore.tasks.filter(t => t.status === 'done').length">
        <p class="ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide text-ios-tertiary-label">
          Completed
        </p>
        <IOSListGroup>
          <IOSListItem
            v-for="task in tasksStore.tasks.filter(t => t.status === 'done')"
            :key="task.id"
            :title="task.title"
            @click="toggleTask(task.id)"
          >
            <template #icon>
              <div class="flex h-6 w-6 items-center justify-center rounded-full bg-ios-green">
                <PhCheckCircle :size="14" weight="fill" class="text-white" />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
      </section>

      <div v-if="!tasksStore.tasks.length" class="py-16 text-center">
        <p class="ios-subhead text-ios-tertiary-label">No tasks yet</p>
        <IOSButton class="mt-4" @click="showSheet = true">Add your first task</IOSButton>
      </div>
    </div>

    <IOSSheet :open="showSheet" title="New Task" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="newTitle" label="Title" placeholder="What needs to be done?" />
        <IOSTextField v-model="newDueDate" label="Due Date" type="date" />
        <div class="space-y-1">
          <label class="ios-footnote font-medium uppercase tracking-wide text-ios-tertiary-label px-1">Priority</label>
          <div class="flex gap-2">
            <button
              v-for="p in (['low', 'medium', 'high'] as TaskPriority[])"
              :key="p"
              type="button"
              class="flex-1 rounded-[10px] py-2 ios-subhead font-medium capitalize transition-colors"
              :class="newPriority === p ? 'bg-ios-blue text-white' : 'bg-black/5 text-black dark:bg-white/10 dark:text-white'"
              @click="newPriority = p"
            >
              {{ p }}
            </button>
          </div>
        </div>
        <IOSButton block @click="addTask">Add Task</IOSButton>
      </div>
    </IOSSheet>
  </div>
</template>
