<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import { PhGithubLogo, PhRocketLaunch, PhTimer, PhListChecks, PhNotePencil } from '@phosphor-icons/vue'
import { useAsyncAction } from '@/composables/useAsyncAction'

const props = defineProps<{ projectId: string }>()
const { run } = useAsyncAction()

const loading = ref(true)
const syncing = ref(false)
const context = ref<Record<string, unknown> | null>(null)

async function loadContext() {
  loading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch(`/api/projects/context?project_id=${encodeURIComponent(props.projectId)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) context.value = body
  } finally {
    loading.value = false
  }
}

async function syncGitHubTime() {
  syncing.value = true
  await run(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')
    const res = await fetch(
      `/api/analytics/sync-github?project_id=${encodeURIComponent(props.projectId)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }
    )
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Sync failed')
    await loadContext()
    return body
  }, { successMessage: 'GitHub activity synced to study sessions' })
  syncing.value = false
}

onMounted(loadContext)
</script>

<template>
  <div v-if="!loading && context" class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <WidgetMetric
        label="Open tasks"
        :value="String((context.tasks as unknown[])?.length ?? 0)"
        :icon="PhListChecks"
      />
      <WidgetMetric
        label="Study logged"
        :value="`${context.study_mins_total ?? 0}m`"
        :icon="PhTimer"
      />
    </div>

    <IOSListGroup v-if="context.github" title="GitHub">
      <IOSListItem
        title="Open issues"
        :subtitle="`${((context.github as { open_issues?: unknown[] }).open_issues ?? []).length} open`"
      >
        <template #icon><PhGithubLogo :size="20" /></template>
      </IOSListItem>
      <IOSListItem
        title="Open PRs"
        :subtitle="`${((context.github as { open_prs?: unknown[] }).open_prs ?? []).length} open`"
      />
    </IOSListGroup>

    <IOSListGroup v-if="context.vercel" title="Vercel">
      <IOSListItem
        title="Recent deploys"
        :subtitle="`${((context.vercel as { deployments?: unknown[] }).deployments ?? []).length} fetched`"
      >
        <template #icon><PhRocketLaunch :size="20" /></template>
      </IOSListItem>
    </IOSListGroup>

    <IOSListGroup title="Nexus">
      <IOSListItem
        v-for="task in (context.tasks as { id: string; title: string; priority: string }[] | undefined)?.slice(0, 5)"
        :key="task.id"
        :title="task.title"
        :subtitle="task.priority"
      />
      <IOSListItem
        v-for="note in (context.notes as { id: string; title: string }[] | undefined)?.slice(0, 3)"
        :key="note.id"
        :title="note.title"
        subtitle="Note"
      >
        <template #icon><PhNotePencil :size="20" /></template>
      </IOSListItem>
    </IOSListGroup>

    <IOSButton size="sm" variant="bordered" :loading="syncing" @click="syncGitHubTime">
      Sync GitHub activity → study sessions
    </IOSButton>
  </div>
</template>
