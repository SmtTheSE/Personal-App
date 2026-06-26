<script setup lang="ts">
import type { Spreadsheet } from '@/types/spreadsheet'
import { useWorkbookExport } from '@/composables/useWorkbookExport'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import {
  PhFileXls,
  PhFileCsv,
  PhShareNetwork,
  PhCopy,
} from '@phosphor-icons/vue'

const props = defineProps<{
  open: boolean
  workbook: Spreadsheet | null
  activeSheetId?: string | null
}>()

const emit = defineEmits<{ close: [] }>()

const { exportExcel, exportCsv, shareExcel, shareAsText } = useWorkbookExport()

async function handleExportExcel() {
  if (!props.workbook) return
  await exportExcel(props.workbook)
  emit('close')
}

async function handleExportCsv() {
  if (!props.workbook) return
  await exportCsv(props.workbook, props.activeSheetId ?? undefined)
  emit('close')
}

async function handleShareFile() {
  if (!props.workbook) return
  await shareExcel(props.workbook)
  emit('close')
}

async function handleShareText() {
  if (!props.workbook) return
  await shareAsText(props.workbook)
  emit('close')
}
</script>

<template>
  <IOSSheet :open="open" title="Export & Share" @close="emit('close')">
    <div class="px-4 pb-8">
      <p class="text-footnote mb-4 text-tertiary">
        Download as Excel, share with classmates, or copy a text summary.
      </p>

      <IOSListGroup :inset="false">
        <IOSListItem title="Export Excel (.xlsx)" subtitle="All sheets + automations" @click="handleExportExcel">
          <template #icon>
            <PhFileXls :size="22" class="text-system-green" weight="fill" />
          </template>
        </IOSListItem>
        <IOSListItem title="Export CSV" subtitle="Current sheet only" @click="handleExportCsv">
          <template #icon>
            <PhFileCsv :size="22" class="text-system-blue" />
          </template>
        </IOSListItem>
        <IOSListItem title="Share Excel File" subtitle="AirDrop, Messages, email…" @click="handleShareFile">
          <template #icon>
            <PhShareNetwork :size="22" class="text-system-blue" weight="fill" />
          </template>
        </IOSListItem>
        <IOSListItem title="Copy Text Summary" subtitle="Paste into chat or notes" @click="handleShareText">
          <template #icon>
            <PhCopy :size="22" class="text-system-purple" />
          </template>
        </IOSListItem>
      </IOSListGroup>
    </div>
  </IOSSheet>
</template>
