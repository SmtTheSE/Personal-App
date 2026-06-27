<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { format, parseISO, isToday, isPast, startOfDay } from 'date-fns'
import { useTasksStore } from '@/stores/tasks'
import { useHaptics } from '@/composables/useHaptics'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSSwipeRow from '@/components/ui/IOSSwipeRow.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import { PhPlus, PhCheckCircle, PhListChecks } from '@phosphor-icons/vue'
import type { Task, TaskPriority } from '@/types'
import type { SwipeAction } from '@/composables/useSwipeGesture'

const tasksStore = useTasksStore()
const router = useRouter()
const { trigger } = useHaptics()
const { run } = useAsyncAction()

const showSheet = ref(false)
const newTitle = ref('')
const newPriority = ref<TaskPriority>('medium')
const newDueDate = ref('')

const todayTasks = computed(() =>
  tasksStore.pendingTasks.filter((t) => {
    if (!t.due_date) return true
    const due = parseISO(t.due_date)
    return isToday(due) || isPast(startOfDay(due))
  })
)

const scheduledTasks = computed(() =>
  tasksStore.pendingTasks.filter((t) => {
    if (!t.due_date) return false
    const due = parseISO(t.due_date)
    return !isToday(due) && !isPast(startOfDay(due))
  })
)

const completedTasks = computed(() =>
  tasksStore.tasks.filter((t) => t.status === 'done')
)

const priorityColors: Record<TaskPriority, 'green' | 'orange' | 'red'> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
}

function swipeActions(task: Task): SwipeAction[] {
  return [
    {
      id: 'complete',
      label: 'Done',
      color: '#fff',
      background: 'var(--color-system-green)',
      side: 'leading',
      onAction: async () => {
        await tasksStore.toggleComplete(task.id)
        trigger('success')
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      color: '#fff',
      background: 'var(--color-system-red)',
      side: 'trailing',
      onAction: async () => {
        await tasksStore.deleteTask(task.id)
        trigger('warning')
      },
    },
  ]
}

async function addTask() {
  if (!newTitle.value.trim()) return
  const result = await run(
    () =>
      tasksStore.createTask({
        title: newTitle.value.trim(),
        priority: newPriority.value,
        due_date: newDueDate.value || undefined,
      }),
    { successMessage: 'Task added' }
  )
  if (!result) return
  newTitle.value = ''
  newPriority.value = 'medium'
  newDueDate.value = ''
  showSheet.value = false
  trigger('light')
}

async function toggleTask(id: string) {
  await run(() => tasksStore.toggleComplete(id))
  trigger('success')
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Tasks" large>
        <div class="flex items-center justify-end gap-2 px-4 pb-2">
          <IOSButton size="sm" variant="bordered" @click="router.push('/kanban')">
            Kanban
          </IOSButton>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-system-blue)] text-white press-scale"
            aria-label="Add task"
            @click="showSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 py-4">
      <template v-if="tasksStore.tasks.length">
        <IOSListGroup v-if="todayTasks.length" title="Today">
          <IOSSwipeRow v-for="task in todayTasks" :key="task.id" :actions="swipeActions(task)">
            <IOSListItem :title="task.title" @click="toggleTask(task.id)">
              <template #icon>
                <div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-tertiary" />
              </template>
              <template #trailing>
                <div @click.stop>
                  <IOSChip :label="task.priority" :color="priorityColors[task.priority]" selected />
                </div>
              </template>
            </IOSListItem>
          </IOSSwipeRow>
        </IOSListGroup>

        <IOSListGroup v-if="scheduledTasks.length" title="Scheduled">
          <IOSSwipeRow v-for="task in scheduledTasks" :key="task.id" :actions="swipeActions(task)">
            <IOSListItem
              :title="task.title"
              :subtitle="task.due_date ? format(parseISO(task.due_date), 'MMM d') : undefined"
              @click="toggleTask(task.id)"
            >
              <template #icon>
                <div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-tertiary" />
              </template>
              <template #trailing>
                <div @click.stop>
                  <IOSChip :label="task.priority" :color="priorityColors[task.priority]" selected />
                </div>
              </template>
            </IOSListItem>
          </IOSSwipeRow>
        </IOSListGroup>

        <IOSListGroup v-if="completedTasks.length" title="Completed">
          <IOSSwipeRow v-for="task in completedTasks" :key="task.id" :actions="swipeActions(task)">
            <IOSListItem :title="task.title" @click="toggleTask(task.id)">
              <template #icon>
                <div class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-system-green)]">
                  <PhCheckCircle :size="14" weight="fill" class="text-white" />
                </div>
              </template>
            </IOSListItem>
          </IOSSwipeRow>
        </IOSListGroup>
      </template>

      <IOSEmptyState
        v-else
        title="No tasks yet"
        subtitle="Add your first task to start tracking your day"
        :icon="PhListChecks"
      >
        <IOSButton @click="showSheet = true">Add Task</IOSButton>
      </IOSEmptyState>
    </div>

    <IOSSheet :open="showSheet" title="New Task" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="newTitle" label="Title" placeholder="What needs to be done?" clearable />
        <IOSTextField v-model="newDueDate" label="Due Date" type="date" />
        <div class="space-y-2">
          <label class="text-section-header px-1">Priority</label>
          <div class="flex gap-2">
            <IOSChip
              v-for="p in (['low', 'medium', 'high'] as TaskPriority[])"
              :key="p"
              :label="p"
              :color="priorityColors[p]"
              :selected="newPriority === p"
              class="flex-1"
              @click="newPriority = p"
            />
          </div>
        </div>
        <IOSButton type="button" block variant="filled" @click="addTask">Add Task</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
