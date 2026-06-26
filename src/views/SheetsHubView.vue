<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSpreadsheetsStore } from '@/stores/spreadsheets'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { TEMPLATE_CATALOG } from '@/lib/spreadsheet/templates'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSSkeleton from '@/components/ui/IOSSkeleton.vue'
import IOSContextMenu from '@/components/ui/IOSContextMenu.vue'
import ExportShareSheet from '@/components/spreadsheet/ExportShareSheet.vue'
import { PhTable, PhPlus, PhLightning, PhShareNetwork } from '@phosphor-icons/vue'
import type { Spreadsheet, SpreadsheetTemplate } from '@/types/spreadsheet'

const router = useRouter()
const store = useSpreadsheetsStore()
const { run } = useAsyncAction()

const showNewSheet = ref(false)
const showExportShare = ref(false)
const exportWorkbook = ref<Spreadsheet | null>(null)
const newTitle = ref('')
const selectedTemplate = ref<SpreadsheetTemplate>('assignments')

function openExportShare(wb: Spreadsheet) {
  exportWorkbook.value = wb
  showExportShare.value = true
}

async function handleRefresh() {
  await store.fetchSpreadsheets()
}

async function createFromTemplate() {
  const title = newTitle.value.trim() || TEMPLATE_CATALOG.find((t) => t.id === selectedTemplate.value)?.title || 'My Sheet'
  const result = await run(
    () => store.createSpreadsheet(title, selectedTemplate.value),
    { successMessage: 'Sheet created' }
  )
  if (!result) return
  showNewSheet.value = false
  newTitle.value = ''
  router.push(`/sheets/${result.id}`)
}

function automationCount(id: string) {
  const s = store.getById(id)
  if (!s) return 0
  return s.doc.sheets.reduce((n, sh) => n + sh.automations.filter((a) => a.enabled).length, 0)
}
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar title="Sheets" large show-back>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="New sheet"
            @click="showNewSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 px-4 py-4">
      <section>
        <h2 class="text-title-3 mb-3 text-primary">Templates</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="tpl in TEMPLATE_CATALOG.filter((t) => t.id !== 'custom')"
            :key="tpl.id"
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="selectedTemplate = tpl.id; showNewSheet = true"
          >
            <span class="text-2xl">{{ tpl.icon }}</span>
            <span class="text-headline text-primary">{{ tpl.title }}</span>
            <span class="text-caption-2 line-clamp-2 text-tertiary">{{ tpl.description }}</span>
          </button>
        </div>
      </section>

      <section>
        <h2 class="text-title-3 mb-2 text-primary">Your Workbooks</h2>
        <IOSSkeleton v-if="store.loading" />
        <IOSListGroup v-else-if="store.sorted.length" :inset="false">
          <IOSContextMenu
            v-for="wb in store.sorted"
            :key="wb.id"
            :items="[
              { id: 'export', label: 'Export & Share', onSelect: () => openExportShare(wb) },
            ]"
          >
            <IOSListItem
              :title="wb.title"
              :subtitle="`${wb.doc.sheets.length} sheet(s)`"
              @click="router.push(`/sheets/${wb.id}`)"
            >
              <template #icon>
                <span class="text-xl">{{ wb.icon }}</span>
              </template>
              <template #trailing>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full text-system-blue press-scale"
                    aria-label="Export and share"
                    @click.stop="openExportShare(wb)"
                  >
                    <PhShareNetwork :size="16" weight="fill" />
                  </button>
                  <div v-if="automationCount(wb.id)" class="flex items-center gap-1 text-system-orange">
                    <PhLightning :size="14" weight="fill" />
                    <span class="text-caption-1">{{ automationCount(wb.id) }}</span>
                  </div>
                </div>
              </template>
            </IOSListItem>
          </IOSContextMenu>
        </IOSListGroup>
        <IOSEmptyState v-else title="No sheets yet" subtitle="Create a template with built-in automations" :icon="PhTable">
          <IOSButton @click="showNewSheet = true">Create Sheet</IOSButton>
        </IOSEmptyState>
      </section>
    </div>

    <ExportShareSheet
      :open="showExportShare"
      :workbook="exportWorkbook"
      @close="showExportShare = false"
    />

    <IOSSheet :open="showNewSheet" title="New Workbook" @close="showNewSheet = false">
      <div class="space-y-4 px-4 pb-6">
        <IOSTextField v-model="newTitle" label="Name" :placeholder="TEMPLATE_CATALOG.find(t => t.id === selectedTemplate)?.title" />
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tpl in TEMPLATE_CATALOG"
            :key="tpl.id"
            type="button"
            class="rounded-full px-3 py-1.5 text-caption-1 press-scale"
            :class="selectedTemplate === tpl.id ? 'bg-system-blue text-white' : 'fill-tertiary text-secondary'"
            @click="selectedTemplate = tpl.id"
          >
            {{ tpl.icon }} {{ tpl.title }}
          </button>
        </div>
        <IOSButton block @click="createFromTemplate">Create with Automations</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
