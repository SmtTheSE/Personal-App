import { getIntegration, getIntegrationToken, serviceFetch } from '../integrations.js'
import { parseTelegramNotifications } from '../telegram/notify.js'
import { dispatchNotification } from '../notify/hub.js'
import { vercelDeployRef } from '../tasks/source.js'

interface VercelDeploymentRaw {
  uid: string
  name: string
  state: string
  url: string | null
  created: number
  projectId?: string
}

interface DeployMapping {
  deployment_uid: string
  task_id: string
  content_hash: string
}

interface ProjectLinkRow {
  project_id: string
  external_id: string
  external_ref: Record<string, unknown>
}

async function hashContent(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function fetchProjectLinks(userId: string): Promise<ProjectLinkRow[]> {
  const res = await serviceFetch(
    `/rest/v1/project_integration_links?user_id=eq.${userId}&provider=eq.vercel&select=project_id,external_id,external_ref`
  )
  if (!res.ok) return []
  return res.json()
}

async function fetchMapping(userId: string, deploymentUid: string): Promise<DeployMapping | null> {
  const res = await serviceFetch(
    `/rest/v1/vercel_deploy_sync_mappings?user_id=eq.${userId}&deployment_uid=eq.${encodeURIComponent(deploymentUid)}&select=deployment_uid,task_id,content_hash&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as DeployMapping[]
  return rows[0] ?? null
}

async function nextTaskSortOrder(userId: string): Promise<number> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&select=sort_order&order=sort_order.desc&limit=1`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { sort_order: number }[]
  return (rows[0]?.sort_order ?? -1) + 1
}

async function createDeployFailureTask(
  userId: string,
  deployment: VercelDeploymentRaw,
  projectId: string | null
) {
  const sort_order = await nextTaskSortOrder(userId)
  const url = deployment.url ? `https://${deployment.url}` : null
  const title = `Fix deploy: ${deployment.name}`
  const description = [
    `Vercel deployment failed (${deployment.state}).`,
    url,
    `Deployment: ${deployment.uid}`,
  ]
    .filter(Boolean)
    .join('\n')

  const res = await serviceFetch('/rest/v1/tasks', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title,
      description,
      priority: 'high',
      status: 'todo',
      kanban_column: 'todo',
      due_date: null,
      project_id: projectId,
      sort_order,
      source: 'vercel_deploy',
      external_ref: vercelDeployRef(deployment.uid, url ?? '', deployment.projectId),
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string }[]
  return rows[0]
}

async function upsertMapping(
  userId: string,
  deploymentUid: string,
  taskId: string,
  projectId: string | null,
  contentHash: string
) {
  const res = await serviceFetch(
    '/rest/v1/vercel_deploy_sync_mappings?on_conflict=user_id,deployment_uid',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        deployment_uid: deploymentUid,
        task_id: taskId,
        project_id: projectId,
        content_hash: contentHash,
        last_synced_at: new Date().toISOString(),
      }),
    }
  )
  if (!res.ok) throw new Error(await res.text())
}

function resolveProjectId(links: ProjectLinkRow[], projectId?: string): string | null {
  if (!projectId) return null
  const match = links.find((link) => link.external_id === projectId)
  return match?.project_id ?? null
}

export interface VercelDeploySyncStats {
  created: number
  skipped: number
  notified: number
  errors: string[]
}

export async function syncVercelDeployFailures(userId: string): Promise<VercelDeploySyncStats> {
  const token = await getIntegrationToken(userId, 'vercel')
  if (!token) throw new Error('Vercel not connected')

  const stats: VercelDeploySyncStats = { created: 0, skipped: 0, notified: 0, errors: [] }

  const res = await fetch('https://api.vercel.com/v6/deployments?limit=30&state=ERROR', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Vercel API error: ${await res.text()}`)

  const body = (await res.json()) as { deployments?: VercelDeploymentRaw[] }
  const deployments = body.deployments ?? []
  const links = await fetchProjectLinks(userId)
  const telegramMeta = (await getIntegration(userId, 'telegram'))?.metadata ?? {}
  const notifySettings = parseTelegramNotifications(telegramMeta)

  for (const deployment of deployments) {
    try {
      const contentHash = await hashContent(`${deployment.uid}:${deployment.state}`)
      const existing = await fetchMapping(userId, deployment.uid)
      if (existing) {
        stats.skipped++
        continue
      }

      const nexusProjectId = resolveProjectId(links, deployment.projectId)
      const task = await createDeployFailureTask(userId, deployment, nexusProjectId)
      if (!task?.id) throw new Error('Task create returned no row')

      await upsertMapping(userId, deployment.uid, task.id, nexusProjectId, contentHash)
      stats.created++

      if (notifySettings.alert_deploy_fail) {
        const url = deployment.url ? `https://${deployment.url}` : ''
        const r = await dispatchNotification(userId, {
          event_type: 'deploy_fail',
          title: `Deploy failed: ${deployment.name}`,
          body: 'A task was created in Nexus.',
          dedupe_key: `deploy_fail:${deployment.uid}`,
          telegram_html: `🚨 <b>Deploy failed</b>: ${deployment.name}\nTask created in Nexus.${url ? `\n${url}` : ''}`,
          payload: { deployment_uid: deployment.uid, url },
        })
        if (r.telegram || r.in_app || r.web_push) stats.notified++
      }
    } catch (err) {
      stats.errors.push(
        `${deployment.uid}: ${err instanceof Error ? err.message : 'sync failed'}`
      )
    }
  }

  return stats
}
