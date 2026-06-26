<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSpreadsheetsStore } from '@/stores/spreadsheets'
import { useTasksStore } from '@/stores/tasks'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useHaptics } from '@/composables/useHaptics'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import SpreadsheetGrid from '@/components/spreadsheet/SpreadsheetGrid.vue'
import AutomationPanel from '@/components/spreadsheet/AutomationPanel.vue'
import ExportShareSheet from '@/components/spreadsheet/ExportShareSheet.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import type { SheetColumn } from '@/types/spreadsheet'
import { PhLightning, PhTrash, PhShareNetwork } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const store = useSpreadsheetsStore()
const tasksStore = useTasksStore()
const { run } = useAsyncAction()
const { trigger } = useHaptics()

const sheetId = ref<string | null>(null)
const showCellEditor = ref(false)
const showAutomations = ref(false)
const showExportShare = ref(false)
const editingRowId = ref<string | null>(null)
const editingColId = ref<string | null>(null)
const editValue = ref('')
const saving = ref(false)

const workbookId = computed(() => route.params.id as string)
const workbook = computed(() => store.getById(workbookId.value))

const activeSheet = computed(() => {
  if (!workbook.value) return null
  const sid = sheetId.value ?? workbook.value.doc.activeSheetId
  return workbook.value.doc.sheets.find((s) => s.id === sid) ?? workbook.value.doc.sheets[0] ?? null
})

const editingColumn = computed((): SheetColumn | null => {
  if (!activeSheet.value || !editingColId.value) return null
  return activeSheet.value.columns.find((c) => c.id === editingColId.value) ?? null
})

const stats = computed(() => {
  if (!activeSheet.value || !workbook.value) return null
  return store.sheetStats(activeSheet.value, workbook.value.template)
})

onMounted(async () => {
  if (!store.spreadsheets.length) await store.fetchSpreadsheets()
  if (workbook.value) sheetId.value = workbook.value.doc.activeSheetId
})

watch(workbook, (wb) => {
  if (wb && !sheetId.value) sheetId.value = wb.doc.activeSheetId
})

function openCell(rowId: string, columnId: string) {
  if (!workbook.value || !activeSheet.value) return
  const col = activeSheet.value.columns.find((c) => c.id === columnId)
  if (col?.readOnly || col?.type === 'formula') return

  editingRowId.value = rowId
  editingColId.value = columnId
  const row = activeSheet.value.rows.find((r) => r.id === rowId)
  const raw = row?.cells[columnId]
  if (col?.type === 'checkbox') {
    editValue.value = raw ? 'true' : 'false'
  } else {
    editValue.value = raw === null || raw === undefined ? '' : String(raw)
  }
  showCellEditor.value = true
  trigger('light')
}

async function persistDoc(doc: ReturnType<typeof store.updateCell> extends infer D ? D : never) {
  if (!workbook.value) return
  saving.value = true
  await run(() => store.saveDoc(workbook.value!.id, doc), { successMessage: 'Saved' })
  saving.value = false
}

async function saveCell() {
  if (!workbook.value || !activeSheet.value || !editingRowId.value || !editingColId.value || !editingColumn.value) return

  let value: string | number | boolean | null = editValue.value
  const col = editingColumn.value

  if (col.type === 'number') value = editValue.value === '' ? 0 : Number(editValue.value)
  else if (col.type === 'checkbox') value = editValue.value === 'true'
  else if (col.type === 'date') value = editValue.value || null

  let doc = store.updateCell(workbook.value, activeSheet.value.id, editingRowId.value, editingColId.value, value)

  const sheet = doc.sheets.find((s) => s.id === activeSheet.value!.id)!
  const syncs = store.taskSyncsForSheet(sheet, editingRowId.value)
  for (const sync of syncs) {
    await tasksStore.createTask({
      title: sync.title,
      due_date: sync.due_date,
      priority: sync.priority,
    })
  }

  await persistDoc(doc)
  showCellEditor.value = false
  trigger('success')
}

async function handleAddRow() {
  if (!workbook.value || !activeSheet.value) return
  const doc = store.addRow(workbook.value, activeSheet.value.id)
  await persistDoc(doc)
}

async function handleToggleAutomation(ruleId: string, enabled: boolean) {
  if (!workbook.value || !activeSheet.value) return
  const doc = store.toggleAutomation(workbook.value, activeSheet.value.id, ruleId, enabled)
  await run(() => store.saveDoc(workbook.value!.id, doc), {
    successMessage: enabled ? 'Automation on' : 'Automation off',
  })
  trigger('selection')
}

async function deleteWorkbook() {
  if (!workbook.value) return
  const id = workbook.value.id
  const ok = await run(async () => { await store.deleteSpreadsheet(id); return true }, { successMessage: 'Deleted' })
  if (ok) router.push('/sheets')
}
</script>

<template>
  <PageShell v-if="workbook && activeSheet">
    <template #header>
      <NavBar :title="workbook.title" show-back>
        <div class="flex items-center justify-between gap-2 px-4 pb-2">
          <div class="flex gap-1 overflow-x-auto scrollbar-none">
            <IOSChip
              v-for="sh in workbook.doc.sheets"
              :key="sh.id"
              :label="sh.name"
              :selected="sh.id === activeSheet.id"
              @click="sheetId = sh.id"
            />
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-system-blue/15 text-system-blue press-scale"
              aria-label="Export and share"
              @click="showExportShare = true"
            >
              <PhShareNetwork :size="16" weight="fill" />
            </button>
            <button
              type="button"
              class="flex h-9 items-center gap-1 rounded-full bg-system-orange/15 px-3 text-caption-1 font-medium text-system-orange press-scale"
              @click="showAutomations = true"
            >
              <PhLightning :size="14" weight="fill" />
              {{ activeSheet.automations.filter((a) => a.enabled).length }}
            </button>
          </div>
        </div>
      </NavBar>
    </template>

    <div class="space-y-4 px-4 py-4">
      <div
        v-if="stats && ('gpa' in stats || 'planned' in stats)"
        class="surface-elevated grid grid-cols-3 gap-2 p-3 text-center"
        :style="{ borderRadius: 'var(--radius-card)' }"
      >
        <template v-if="'gpa' in stats && stats.gpa !== undefined">
          <div>
            <p class="text-title-2 text-primary">{{ stats.gpa }}</p>
            <p class="text-caption-2 text-tertiary">GPA (4.0)</p>
          </div>
          <div>
            <p class="text-title-2 text-primary">{{ stats.rows ?? activeSheet.rows.length }}</p>
            <p class="text-caption-2 text-tertiary">Courses</p>
          </div>
          <div>
            <p class="text-title-2 text-system-green">{{ stats.excellent ?? 0 }}</p>
            <p class="text-caption-2 text-tertiary">Excellent</p>
          </div>
        </template>
        <template v-else-if="'planned' in stats">
          <div>
            <p class="text-title-2 text-primary">{{ stats.planned }}</p>
            <p class="text-caption-2 text-tertiary">Planned min</p>
          </div>
          <div>
            <p class="text-title-2 text-primary">{{ stats.actual }}</p>
            <p class="text-caption-2 text-tertiary">Actual min</p>
          </div>
          <div>
            <p class="text-title-2" :class="(stats.delta ?? 0) >= 0 ? 'text-system-green' : 'text-system-red'">{{ stats.delta }}</p>
            <p class="text-caption-2 text-tertiary">Delta</p>
          </div>
        </template>
      </div>

      <p v-if="saving" class="text-center text-caption-1 text-tertiary">Running automations…</p>

      <SpreadsheetGrid
        :columns="activeSheet.columns"
        :rows="activeSheet.rows"
        @cell-click="openCell"
        @add-row="handleAddRow"
      />

      <IOSButton variant="destructive" block @click="deleteWorkbook">
        <PhTrash :size="16" class="mr-2 inline" />
        Delete Workbook
      </IOSButton>
    </div>

    <IOSSheet
      :open="showCellEditor"
      :title="editingColumn?.name ?? 'Edit'"
      @close="showCellEditor = false"
    >
      <div class="space-y-4 px-4 pb-6">
        <template v-if="editingColumn?.type === 'select'">
          <p class="text-section-header">Choose value</p>
          <div class="flex flex-wrap gap-2">
            <IOSChip
              v-for="opt in editingColumn.options"
              :key="opt"
              :label="opt"
              :selected="editValue === opt"
              @click="editValue = opt ?? ''"
            />
          </div>
        </template>
        <template v-else-if="editingColumn?.type === 'checkbox'">
          <IOSSwitch
            :model-value="editValue === 'true'"
            label="Checked"
            @update:model-value="editValue = $event ? 'true' : 'false'"
          />
        </template>
        <template v-else-if="editingColumn?.type === 'date'">
          <IOSTextField v-model="editValue" label="Date" type="date" />
        </template>
        <template v-else-if="editingColumn?.type === 'number'">
          <IOSTextField v-model="editValue" label="Number" type="number" />
        </template>
        <template v-else>
          <IOSTextField v-model="editValue" label="Value" />
        </template>
        <IOSButton block @click="saveCell">Save & Run Automations</IOSButton>
      </div>
    </IOSSheet>

    <ExportShareSheet
      :open="showExportShare"
      :workbook="workbook"
      :active-sheet-id="activeSheet.id"
      @close="showExportShare = false"
    />

    <IOSSheet :open="showAutomations" title="Automations" @close="showAutomations = false">
      <div class="px-4 pb-8">
        <p class="text-footnote mb-4 text-tertiary">
          Rules run automatically when you edit cells or open this sheet. Toggle to enable or disable.
        </p>
        <AutomationPanel :rules="activeSheet.automations" @toggle="handleToggleAutomation" />
      </div>
    </IOSSheet>
  </PageShell>

  <div v-else class="flex min-h-[50vh] items-center justify-center">
    <p class="text-subheadline text-tertiary">Loading sheet…</p>
  </div>
</template>
