<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataCleaningStore } from '@/stores/dataCleaning'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { LARGE_DATASET_ROW_WARNING } from '@/lib/dataCleaning/parseImport'
import { downloadCleanedSession } from '@/lib/dataCleaning/exportCleaned'
import { columnsWithIssues } from '@/lib/dataCleaning/profileColumns'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import ColumnProfileCard from '@/components/dataCleaning/ColumnProfileCard.vue'
import CleaningGrid from '@/components/dataCleaning/CleaningGrid.vue'
import {
  PhColumns,
  PhTable,
  PhCopy,
  PhDownloadSimple,
  PhMagicWand,
  PhWarning,
} from '@phosphor-icons/vue'
import type { CleaningView, DedupeStrategy } from '@/types/dataCleaning'

const route = useRoute()
const router = useRouter()
const store = useDataCleaningStore()
const { run } = useAsyncAction()

const selectedColumnId = ref<string | null>(null)

const sessionId = computed(() => String(route.params.id))
const session = computed(() => store.getById(sessionId.value))

const views: { id: CleaningView; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'data', label: 'Data' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'summary', label: 'Summary' },
]

const issueProfiles = computed(() =>
  session.value ? columnsWithIssues(session.value.profiles) : []
)

const duplicateRowIds = computed(() => {
  if (!session.value) return new Set<string>()
  const ids = new Set<string>()
  for (const group of session.value.duplicateGroups) {
    for (const id of group.rowIds) ids.add(id)
  }
  return ids
})

const duplicateRowCount = computed(() => {
  if (!session.value) return 0
  return session.value.duplicateGroups.reduce((n, g) => n + g.rowIds.length - 1, 0)
})

const showLargeDatasetNotice = computed(
  () => (session.value?.rows.length ?? 0) >= LARGE_DATASET_ROW_WARNING
)

watch(sessionId, () => {
  selectedColumnId.value = null
})

onMounted(() => {
  store.loadFromStorage()
  if (!store.getById(sessionId.value)) {
    router.replace('/data-cleaning')
  }
})

function setView(view: CleaningView) {
  store.setActiveView(sessionId.value, view)
}

function toggleDedupeColumn(columnId: string) {
  if (!session.value) return
  const keys = [...session.value.dedupeKeyColumnIds]
  const index = keys.indexOf(columnId)
  if (index >= 0) keys.splice(index, 1)
  else keys.push(columnId)
  store.setDedupeKeys(sessionId.value, keys.length ? keys : session.value.columns.map((c) => c.id))
}

function setStrategy(strategy: DedupeStrategy) {
  store.setDedupeStrategy(sessionId.value, strategy)
}

async function autoClean() {
  await run(() => Promise.resolve(store.runAutoClean(sessionId.value)), {
    successMessage: 'Auto-clean complete',
  })
}

async function dedupeOnly() {
  await run(() => Promise.resolve(store.removeDuplicates(sessionId.value)), {
    successMessage: 'Duplicates removed',
  })
}

async function trimWhitespace() {
  await run(() => Promise.resolve(store.trimAllWhitespace(sessionId.value)), {
    successMessage: 'Whitespace trimmed',
  })
}

function exportFile(format: 'xlsx' | 'csv') {
  const s = session.value
  if (!s) return
  downloadCleanedSession(s, format)
}
</script>

<template>
  <PageShell v-if="session">
    <template #header>
      <NavBar :title="session.title" large show-back>
        <div class="px-4 pb-2">
          <p class="text-footnote text-tertiary">
            {{ session.sourceFilename }} · {{ session.sheetName }}
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <IOSChip
              v-for="view in views"
              :key="view.id"
              :label="view.label"
              :selected="session.activeView === view.id"
              @click="setView(view.id)"
            />
          </div>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 px-4 py-4">
      <p
        v-if="showLargeDatasetNotice"
        class="rounded-xl bg-system-orange/10 px-4 py-3 text-footnote text-system-orange"
      >
        Large dataset ({{ session.rows.length.toLocaleString() }} rows). Cleaning runs in your browser — operations may take longer on this device.
      </p>

      <div class="grid grid-cols-2 gap-3">
        <WidgetMetric
          :icon="PhTable"
          icon-color="text-system-blue"
          label="Rows"
          :value="session.stats.currentRowCount"
          :subtitle="`${session.stats.originalRowCount} original`"
        />
        <WidgetMetric
          :icon="PhColumns"
          icon-color="text-system-purple"
          label="Columns"
          :value="session.columns.length"
        />
        <WidgetMetric
          :icon="PhCopy"
          icon-color="text-system-orange"
          label="Duplicate rows"
          :value="duplicateRowCount"
        />
        <WidgetMetric
          :icon="PhWarning"
          icon-color="text-system-red"
          label="Column issues"
          :value="issueProfiles.length"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <IOSButton size="sm" @click="autoClean">
          <PhMagicWand :size="16" class="mr-1 inline" />
          Auto-clean all
        </IOSButton>
        <IOSButton size="sm" variant="bordered" @click="dedupeOnly">Remove duplicates</IOSButton>
        <IOSButton size="sm" variant="bordered" @click="trimWhitespace">Trim whitespace</IOSButton>
      </div>

      <section v-if="session.activeView === 'profile'">
        <h2 class="text-title-3 mb-2 text-primary">Column profiles</h2>
        <p class="text-footnote mb-3 text-tertiary">
          Tap a column to highlight it in the Data view. Issues are detected immediately on import.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <ColumnProfileCard
            v-for="profile in session.profiles"
            :key="profile.columnId"
            :profile="profile"
            :selected="selectedColumnId === profile.columnId"
            @select="selectedColumnId = profile.columnId; setView('data')"
          />
        </div>
      </section>

      <section v-else-if="session.activeView === 'data'">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-title-3 text-primary">Data preview</h2>
          <button
            v-if="selectedColumnId"
            type="button"
            class="text-caption-1 text-system-blue"
            @click="selectedColumnId = null"
          >
            Clear highlight
          </button>
        </div>
        <CleaningGrid
          :columns="session.columns"
          :rows="session.rows"
          :profiles="session.profiles"
          :highlight-column-id="selectedColumnId"
        />
      </section>

      <section v-else-if="session.activeView === 'duplicates'">
        <h2 class="text-title-3 mb-2 text-primary">Duplicate detection</h2>
        <p class="text-footnote mb-3 text-tertiary">
          Match rows using selected key columns. Default: all columns.
        </p>

        <div class="mb-4 flex flex-wrap gap-2">
          <IOSChip
            v-for="col in session.columns"
            :key="col.id"
            :label="col.name"
            :selected="session.dedupeKeyColumnIds.includes(col.id)"
            @click="toggleDedupeColumn(col.id)"
          />
        </div>

        <div class="mb-4 flex gap-2">
          <IOSChip
            label="Keep first"
            :selected="session.dedupeStrategy === 'first'"
            @click="setStrategy('first')"
          />
          <IOSChip
            label="Keep last"
            :selected="session.dedupeStrategy === 'last'"
            @click="setStrategy('last')"
          />
        </div>

        <CleaningGrid
          v-if="session.duplicateGroups.length"
          :columns="session.columns"
          :rows="session.rows.filter((r) => duplicateRowIds.has(r.id))"
          :profiles="session.profiles"
          :duplicate-row-ids="duplicateRowIds"
          :max-rows="100"
        />
        <p v-else class="text-footnote text-tertiary">No duplicate rows found with current keys.</p>

        <div v-if="session.duplicateGroups.length" class="mt-4 space-y-2">
          <div
            v-for="group in session.duplicateGroups.slice(0, 20)"
            :key="group.key"
            class="surface-elevated flex items-center justify-between px-4 py-3"
            :style="{ borderRadius: 'var(--radius-card)' }"
          >
            <span class="text-footnote text-primary">{{ group.rowIds.length }} matching rows</span>
            <span class="text-caption-1 text-tertiary">key hash …{{ group.key.slice(-8) }}</span>
          </div>
        </div>
      </section>

      <section v-else>
        <h2 class="text-title-3 mb-2 text-primary">Cleaning summary</h2>
        <div class="surface-elevated space-y-3 p-4" :style="{ borderRadius: 'var(--radius-card)' }">
          <div class="flex items-center justify-between">
            <span class="text-footnote text-tertiary">Original rows</span>
            <span class="text-headline text-primary">{{ session.stats.originalRowCount.toLocaleString() }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-footnote text-tertiary">Current rows</span>
            <span class="text-headline text-primary">{{ session.stats.currentRowCount.toLocaleString() }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-footnote text-tertiary">Duplicates removed</span>
            <span class="text-headline text-system-orange">{{ session.stats.duplicateRowsRemoved.toLocaleString() }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-footnote text-tertiary">Whitespace cells trimmed</span>
            <span class="text-headline text-primary">{{ session.stats.whitespaceTrimmed.toLocaleString() }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-footnote text-tertiary">Empty rows removed</span>
            <span class="text-headline text-primary">{{ session.stats.emptyRowsRemoved.toLocaleString() }}</span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <IOSButton block @click="exportFile('xlsx')">
            <PhDownloadSimple :size="18" class="mr-2 inline" />
            Export Excel
          </IOSButton>
          <IOSButton block variant="bordered" @click="exportFile('csv')">
            <PhDownloadSimple :size="18" class="mr-2 inline" />
            Export CSV
          </IOSButton>
        </div>
      </section>
    </div>
  </PageShell>
</template>
