<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useDataCleaningStore } from '@/stores/dataCleaning'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSContextMenu from '@/components/ui/IOSContextMenu.vue'
import {
  PhBroom,
  PhUploadSimple,
  PhFileCsv,
  PhFileXls,
  PhRows,
  PhWarning,
} from '@phosphor-icons/vue'

const router = useRouter()
const store = useDataCleaningStore()
const { run } = useAsyncAction()

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)

onMounted(() => store.loadFromStorage())

function openFilePicker() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importing.value = true
  const session = await run(() => store.importFile(file), { successMessage: 'Dataset loaded' })
  importing.value = false
  if (session) router.push(`/data-cleaning/${session.id}`)
}

async function handleDelete(id: string) {
  await run(async () => {
    store.deleteSession(id)
  }, { successMessage: 'Session deleted' })
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Data Cleaning" large show-back>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Upload file"
            :disabled="importing"
            @click="openFilePicker"
          >
            <PhUploadSimple :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <input
      ref="fileInput"
      type="file"
      accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      class="hidden"
      @change="onFileSelected"
    />

    <div class="space-y-6 px-4 py-4">
      <section
        class="surface-elevated p-4"
        :style="{ borderRadius: 'var(--radius-card)' }"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-system-purple/15 text-system-purple">
            <PhBroom :size="24" weight="fill" />
          </div>
          <div>
            <h2 class="text-headline text-primary">Analyst-style cleaning</h2>
            <p class="text-footnote mt-1 text-tertiary">
              Upload CSV or Excel (max 10 MB, 25k rows). Profile columns instantly, remove duplicates, and export cleaned data — all in your browser.
            </p>
          </div>
        </div>
        <IOSButton class="mt-4" block :loading="importing" @click="openFilePicker">
          <PhUploadSimple :size="18" class="mr-2 inline" />
          Upload CSV / Excel
        </IOSButton>
      </section>

      <section v-if="store.sorted.length">
        <h2 class="text-title-3 mb-2 text-primary">Recent sessions</h2>
        <IOSListGroup :inset="false">
          <IOSContextMenu
            v-for="session in store.sorted"
            :key="session.id"
            :items="[
              { id: 'delete', label: 'Delete', destructive: true, onSelect: () => handleDelete(session.id) },
            ]"
          >
            <IOSListItem
              :title="session.title"
              :subtitle="`${session.stats.currentRowCount.toLocaleString()} rows · ${session.columns.length} cols · ${format(new Date(session.updatedAt), 'MMM d')}`"
              @click="router.push(`/data-cleaning/${session.id}`)"
            >
              <template #icon>
                <component
                  :is="session.sourceType === 'csv' ? PhFileCsv : PhFileXls"
                  :size="22"
                  class="text-system-green"
                />
              </template>
              <template #trailing>
                <div class="flex items-center gap-2 text-caption-1 text-tertiary">
                  <span v-if="session.duplicateGroups.length" class="flex items-center gap-1 text-system-orange">
                    <PhWarning :size="14" />
                    {{ session.duplicateGroups.length }}
                  </span>
                  <PhRows :size="16" />
                </div>
              </template>
            </IOSListItem>
          </IOSContextMenu>
        </IOSListGroup>
      </section>

      <IOSEmptyState
        v-else
        title="No datasets yet"
        subtitle="Upload a CSV or Excel file to start profiling and cleaning"
        :icon="PhBroom"
      >
        <IOSButton @click="openFilePicker">Upload file</IOSButton>
      </IOSEmptyState>
    </div>
  </PageShell>
</template>
