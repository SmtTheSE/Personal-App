<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useGitHubIssuesStore } from '@/stores/githubIssues'
import { useIntegrationsStore } from '@/stores/integrations'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSSkeleton from '@/components/ui/IOSSkeleton.vue'
import { PhGithubLogo, PhArrowSquareOut, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const router = useRouter()
const githubIssues = useGitHubIssuesStore()
const integrations = useIntegrationsStore()
const { run } = useAsyncAction()

const repoSearch = ref('')

const filteredRepos = computed(() => {
  const q = repoSearch.value.trim().toLowerCase()
  if (!q) return integrations.githubRepos
  return integrations.githubRepos.filter(
    (repo) =>
      repo.full_name.toLowerCase().includes(q) ||
      (repo.description?.toLowerCase().includes(q) ?? false)
  )
})

const lastSyncLabel = computed(() => {
  if (!githubIssues.lastSyncAt) return 'Never synced'
  return formatDistanceToNow(parseISO(githubIssues.lastSyncAt), { addSuffix: true })
})

async function loadRepos() {
  if (!integrations.githubConnected) return
  await run(() => integrations.fetchGitHubRepos(1))
}

async function toggleEnabled(value: boolean) {
  await run(() => githubIssues.saveSettings({ enabled: value }), { successMessage: 'Settings saved' })
}

async function toggleClosed(value: boolean) {
  await run(() => githubIssues.saveSettings({ sync_closed_as_done: value }), { successMessage: 'Settings saved' })
}

async function onToggleRepo(fullName: string, value: boolean) {
  await run(() => githubIssues.toggleRepo(fullName, value), { successMessage: 'Repos updated' })
}

async function syncNow() {
  await run(() => githubIssues.syncNow(), { successMessage: 'GitHub issues synced' })
}

function openRepo(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  await Promise.all([
    githubIssues.fetchStatus().catch(() => {}),
    integrations.fetchStatuses().catch(() => {}),
  ])
  await loadRepos()
})
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="GitHub Issues" large show-back />
    </template>

    <div class="space-y-6 py-4">
      <IOSEmptyState
        v-if="!githubIssues.loading && !githubIssues.githubConnected"
        title="Connect GitHub"
        subtitle="Sign in with GitHub in Settings to sync open issues into Nexus tasks."
        :icon="PhGithubLogo"
      >
        <IOSButton @click="router.push('/settings')">Open Settings</IOSButton>
      </IOSEmptyState>

      <template v-else>
        <IOSListGroup title="Sync">
          <IOSListItem
            title="Enable issue sync"
            subtitle="Import open issues from selected repos as Nexus tasks"
            @click.prevent
          >
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="githubIssues.settings.enabled"
                  label="Enable issue sync"
                  :disabled="githubIssues.saving"
                  @update:model-value="toggleEnabled"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSListItem
            title="Close tasks when issue closes"
            subtitle="Marks synced tasks done when the GitHub issue is no longer open"
            @click.prevent
          >
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="githubIssues.settings.sync_closed_as_done"
                  label="Close tasks when issue closes"
                  :disabled="githubIssues.saving"
                  @update:model-value="toggleClosed"
                />
              </div>
            </template>
          </IOSListItem>
          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-footnote text-tertiary">Last sync {{ lastSyncLabel }}</p>
              <p v-if="githubIssues.lastSyncStats" class="text-caption-1 text-tertiary">
                +{{ githubIssues.lastSyncStats.created }} new ·
                {{ githubIssues.lastSyncStats.updated }} updated ·
                {{ githubIssues.lastSyncStats.closed }} closed
              </p>
            </div>
            <IOSButton
              size="sm"
              :loading="githubIssues.syncing"
              :disabled="!githubIssues.settings.enabled || !githubIssues.settings.repos.length"
              @click="syncNow"
            >
              Sync now
            </IOSButton>
          </div>
        </IOSListGroup>

        <IOSListGroup title="Repositories">
          <div class="px-4 py-3">
            <input
              v-model="repoSearch"
              type="search"
              placeholder="Search repos…"
              class="w-full rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none focus:ring-2 focus:ring-[var(--color-system-blue)]/30"
            />
          </div>

          <div v-if="integrations.loading" class="space-y-2 px-4 py-2">
            <IOSSkeleton v-for="i in 4" :key="i" class="h-14 rounded-xl" />
          </div>

          <template v-else>
            <IOSListItem
              v-for="repo in filteredRepos"
              :key="repo.id"
              :title="repo.full_name"
              :subtitle="repo.description ?? repo.language ?? 'No description'"
              @click.prevent
            >
              <template #icon>
                <PhGithubLogo :size="22" class="text-primary" weight="fill" />
              </template>
              <template #trailing>
                <div class="flex items-center gap-2" @click.stop>
                  <button
                    type="button"
                    class="press-scale text-tertiary"
                    :aria-label="`Open ${repo.full_name} on GitHub`"
                    @click="openRepo(repo.html_url)"
                  >
                    <PhArrowSquareOut :size="18" />
                  </button>
                  <IOSSwitch
                    :model-value="githubIssues.settings.repos.includes(repo.full_name)"
                    :label="`Sync ${repo.full_name}`"
                    :disabled="githubIssues.saving"
                    @update:model-value="onToggleRepo(repo.full_name, $event)"
                  />
                </div>
              </template>
            </IOSListItem>

            <div
              v-if="integrations.githubReposHasMore || integrations.githubReposPage > 1"
              class="flex items-center justify-between px-4 py-3"
            >
              <IOSButton
                size="sm"
                variant="bordered"
                :disabled="integrations.githubReposPage <= 1 || integrations.loading"
                @click="integrations.prevGitHubReposPage()"
              >
                <PhCaretLeft :size="16" class="inline" />
              </IOSButton>
              <span class="text-caption-1 text-tertiary">Page {{ integrations.githubReposPage }}</span>
              <IOSButton
                size="sm"
                variant="bordered"
                :disabled="!integrations.githubReposHasMore || integrations.loading"
                @click="integrations.nextGitHubReposPage()"
              >
                <PhCaretRight :size="16" class="inline" />
              </IOSButton>
            </div>
          </template>
        </IOSListGroup>

        <div class="px-4">
          <p class="text-caption-1 text-tertiary">
            Labels map to priority (e.g. <code>bug</code> → high, <code>enhancement</code> → low).
            Milestone due dates become task due dates. Tasks link to projects when <code>repo_url</code> matches.
          </p>
        </div>
      </template>
    </div>
  </PageShell>
</template>
