<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { format, subDays } from 'date-fns'
import { useRouter } from 'vue-router'
import { useIntegrationsStore } from '@/stores/integrations'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSkeleton from '@/components/ui/IOSSkeleton.vue'
import {
  PhRocketLaunch,
  PhGithubLogo,
  PhCloud,
  PhCheckCircle,
  PhXCircle,
  PhSpinner,
  PhArrowSquareOut,
  PhGear,
} from '@phosphor-icons/vue'
import type { VercelDeploymentState } from '@/types/integrations'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const router = useRouter()
const integrations = useIntegrationsStore()
const { run } = useAsyncAction()

const dashboard = computed(() => integrations.dashboard)

const chartData = computed(() => {
  const byDay = dashboard.value?.stats.deploysByDay ?? {}
  const labels: string[] = []
  const data: number[] = []
  for (let i = 13; i >= 0; i--) {
    const day = subDays(new Date(), i)
    const key = format(day, 'yyyy-MM-dd')
    labels.push(format(day, 'MMM d'))
    data.push(byDay[key] ?? 0)
  }
  return {
    labels,
    datasets: [{
      label: 'Deploys',
      data,
      backgroundColor: 'rgba(0, 122, 255, 0.75)',
      borderRadius: 6,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1, color: '#8E8E93' } },
    x: { grid: { display: false }, ticks: { color: '#8E8E93', maxRotation: 0 } },
  },
}

function stateColor(state: VercelDeploymentState | undefined) {
  if (state === 'READY') return 'text-system-green'
  if (state === 'ERROR' || state === 'CANCELED') return 'text-system-red'
  if (state === 'BUILDING' || state === 'QUEUED') return 'text-system-orange'
  return 'text-tertiary'
}

function stateLabel(state: VercelDeploymentState | undefined) {
  if (!state) return 'No deploys'
  return state.charAt(0) + state.slice(1).toLowerCase()
}

async function handleRefresh() {
  await integrations.fetchStatuses()
  await run(() => integrations.fetchDashboard())
}

onMounted(async () => {
  await integrations.fetchStatuses()
  if (integrations.githubConnected || integrations.vercelConnected) {
    await run(() => integrations.fetchDashboard())
  }
})
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar title="Deployments" large show-back>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full fill-tertiary text-system-blue press-scale"
            aria-label="Integration settings"
            @click="router.push('/settings')"
          >
            <PhGear :size="20" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 px-4 py-4">
      <div
        v-if="!integrations.githubConnected && !integrations.vercelConnected"
        class="surface-elevated space-y-3 p-4 text-center"
        :style="{ borderRadius: 'var(--radius-card)' }"
      >
        <PhRocketLaunch :size="40" class="mx-auto text-system-blue" weight="fill" />
        <h2 class="text-headline text-primary">Connect GitHub & Vercel</h2>
        <p class="text-footnote text-tertiary">
          Link your accounts in Settings to see repos, live deploy status, and deployment analytics.
        </p>
        <IOSButton block @click="router.push('/settings')">Open Settings</IOSButton>
      </div>

      <template v-else>
        <div class="flex flex-wrap gap-2">
          <span
            class="rounded-full px-3 py-1 text-caption-1"
            :class="integrations.githubConnected ? 'bg-system-green/15 text-system-green' : 'fill-tertiary text-tertiary'"
          >
            <PhGithubLogo :size="14" class="mr-1 inline" />
            GitHub {{ integrations.githubConnected ? 'connected' : 'not connected' }}
          </span>
          <span
            class="rounded-full px-3 py-1 text-caption-1"
            :class="integrations.vercelConnected ? 'bg-system-green/15 text-system-green' : 'fill-tertiary text-tertiary'"
          >
            <PhCloud :size="14" class="mr-1 inline" />
            Vercel {{ integrations.vercelConnected ? 'connected' : 'not connected' }}
          </span>
        </div>

        <IOSSkeleton v-if="integrations.dashboardLoading && !dashboard" />

        <template v-else-if="dashboard">
          <div class="grid grid-cols-2 gap-3">
            <WidgetMetric
              :icon="PhRocketLaunch"
              icon-color="text-system-blue"
              label="Deploys (recent)"
              :value="dashboard.stats.totalDeploys"
            />
            <WidgetMetric
              :icon="PhCheckCircle"
              icon-color="text-system-green"
              label="Success rate"
              :value="`${dashboard.stats.successRate}%`"
            />
            <WidgetMetric
              :icon="PhXCircle"
              icon-color="text-system-red"
              label="Failed"
              :value="dashboard.stats.errorCount"
            />
            <WidgetMetric
              :icon="PhSpinner"
              icon-color="text-system-orange"
              label="Building"
              :value="dashboard.stats.buildingCount"
            />
          </div>

          <div class="surface-elevated p-4" :style="{ borderRadius: 'var(--radius-card)' }">
            <h3 class="text-headline mb-3 text-primary">Deploy activity</h3>
            <div class="h-44">
              <Bar :data="chartData" :options="chartOptions" />
            </div>
          </div>

          <section>
            <h3 class="text-headline mb-2 text-primary">Repos on Vercel</h3>
            <IOSListGroup v-if="dashboard.linked.filter((l) => l.onVercel).length" :inset="false">
              <IOSListItem
                v-for="item in dashboard.linked.filter((l) => l.onVercel)"
                :key="item.repoFullName"
                :title="item.repoFullName"
                :subtitle="item.vercelProject?.framework ?? item.github?.language ?? 'Project'"
              >
                <template #icon>
                  <PhGithubLogo :size="22" class="text-primary" weight="fill" />
                </template>
                <template #trailing>
                  <div class="flex items-center gap-2">
                    <span class="text-caption-1 font-medium" :class="stateColor(item.latestDeployment?.state)">
                      {{ stateLabel(item.latestDeployment?.state) }}
                    </span>
                    <a
                      v-if="item.latestDeployment?.url"
                      :href="`https://${item.latestDeployment.url}`"
                      target="_blank"
                      rel="noopener"
                      class="text-system-blue"
                      @click.stop
                    >
                      <PhArrowSquareOut :size="16" />
                    </a>
                  </div>
                </template>
              </IOSListItem>
            </IOSListGroup>
            <p v-else class="text-footnote text-tertiary">No GitHub-linked Vercel projects found.</p>
          </section>

          <section v-if="dashboard.linked.filter((l) => !l.onVercel).length">
            <h3 class="text-headline mb-2 text-primary">GitHub only (not on Vercel)</h3>
            <IOSListGroup :inset="false">
              <IOSListItem
                v-for="item in dashboard.linked.filter((l) => !l.onVercel).slice(0, 10)"
                :key="item.repoFullName"
                :title="item.repoFullName"
                :subtitle="item.github?.description ?? 'Not deployed on Vercel'"
              >
                <template #icon>
                  <PhGithubLogo :size="22" class="text-tertiary" />
                </template>
              </IOSListItem>
            </IOSListGroup>
          </section>
        </template>
      </template>
    </div>
  </PageShell>
</template>
