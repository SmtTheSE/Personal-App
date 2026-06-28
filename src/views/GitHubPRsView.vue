<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useGitHubPRsStore } from '@/stores/githubPRs'
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
import { PhGithubLogo, PhArrowSquareOut } from '@phosphor-icons/vue'

const router = useRouter()
const githubPRs = useGitHubPRsStore()
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
  if (!githubPRs.lastSyncAt) return 'Never synced'
  return formatDistanceToNow(parseISO(githubPRs.lastSyncAt), { addSuffix: true })
})

async function loadRepos() {
  if (!integrations.githubConnected) return
  await run(() => integrations.fetchGitHubRepos(1))
}

async function toggleEnabled(value: boolean) {
  await run(() => githubPRs.saveSettings({ enabled: value }), { successMessage: 'Settings saved' })
}

async function toggleReviewOnly(value: boolean) {
  await run(() => githubPRs.saveSettings({ review_requested_only: value }), { successMessage: 'Settings saved' })
}

async function toggleMerged(value: boolean) {
  await run(() => githubPRs.saveSettings({ sync_merged_as_done: value }), { successMessage: 'Settings saved' })
}

async function onToggleRepo(fullName: string, value: boolean) {
  await run(() => githubPRs.toggleRepo(fullName, value), { successMessage: 'Repos updated' })
}

async function syncNow() {
  await run(() => githubPRs.syncNow(), { successMessage: 'GitHub PRs synced' })
}

function openRepo(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  await Promise.all([
    githubPRs.fetchStatus().catch(() => {}),
    integrations.fetchStatuses().catch(() => {}),
  ])
  await loadRepos()
})
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="GitHub PRs" large show-back />
    </template>

    <div class="space-y-6 py-4">
      <IOSEmptyState
        v-if="!githubPRs.loading && !githubPRs.githubConnected"
        title="Connect GitHub"
        subtitle="Sign in with GitHub in Settings to sync open PRs into the kanban review column."
        :icon="PhGithubLogo"
      >
        <IOSButton @click="router.push('/settings')">Open Settings</IOSButton>
      </IOSEmptyState>

      <template v-else>
        <IOSListGroup title="Sync">
          <IOSListItem
            title="Enable PR sync"
            subtitle="Import open pull requests as review-column tasks"
            @click.prevent
          >
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="githubPRs.settings.enabled"
                  label="Enable PR sync"
                  :disabled="githubPRs.saving"
                  @update:model-value="toggleEnabled"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSListItem
            title="Review requested only"
            subtitle="Only PRs where you are a requested reviewer"
            @click.prevent
          >
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="githubPRs.settings.review_requested_only"
                  label="Review requested only"
                  :disabled="githubPRs.saving"
                  @update:model-value="toggleReviewOnly"
                />
              </div>
            </template>
          </IOSListItem>
          <IOSListItem
            title="Complete when PR merges"
            subtitle="Marks synced tasks done when the PR is no longer open"
            @click.prevent
          >
            <template #trailing>
              <div @click.stop>
                <IOSSwitch
                  :model-value="githubPRs.settings.sync_merged_as_done"
                  label="Complete when PR merges"
                  :disabled="githubPRs.saving"
                  @update:model-value="toggleMerged"
                />
              </div>
            </template>
          </IOSListItem>
          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-footnote text-tertiary">Last sync {{ lastSyncLabel }}</p>
              <p v-if="githubPRs.lastSyncStats" class="text-caption-1 text-tertiary">
                +{{ githubPRs.lastSyncStats.created }} new ·
                {{ githubPRs.lastSyncStats.updated }} updated ·
                {{ githubPRs.lastSyncStats.closed }} closed
              </p>
            </div>
            <IOSButton
              size="sm"
              :loading="githubPRs.syncing"
              :disabled="!githubPRs.settings.enabled || !githubPRs.settings.repos.length"
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
                    :model-value="githubPRs.settings.repos.includes(repo.full_name)"
                    :label="`Sync PRs ${repo.full_name}`"
                    :disabled="githubPRs.saving"
                    @update:model-value="onToggleRepo(repo.full_name, $event)"
                  />
                </div>
              </template>
            </IOSListItem>
          </template>
        </IOSListGroup>

        <div class="px-4">
          <p class="text-caption-1 text-tertiary">
            Synced PRs land in the kanban <strong>Review</strong> column and appear in your weekly plan as review blocks.
          </p>
        </div>
      </template>
    </div>
  </PageShell>
</template>
