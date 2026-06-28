export type TaskSource = 'manual' | 'github_issue' | 'github_pr' | 'telegram' | 'vercel_deploy'

export interface TaskExternalRef {
  provider: TaskSource
  repo?: string
  number?: number
  id?: string | number
  url?: string
  deployment_uid?: string
  vercel_project_id?: string
}

export function githubIssueRef(repo: string, number: number, url: string): TaskExternalRef {
  return { provider: 'github_issue', repo, number, url }
}

export function githubPrRef(repo: string, number: number, url: string): TaskExternalRef {
  return { provider: 'github_pr', repo, number, url }
}

export function vercelDeployRef(
  deploymentUid: string,
  url: string,
  vercelProjectId?: string
): TaskExternalRef {
  return {
    provider: 'vercel_deploy',
    deployment_uid: deploymentUid,
    url,
    vercel_project_id: vercelProjectId,
  }
}

export function externalRefMatches(ref: TaskExternalRef | null | undefined, source: TaskSource): boolean {
  return ref?.provider === source
}

export function formatGitHubFooter(repo: string, number: number, url: string, kind: 'issue' | 'pr'): string {
  const label = kind === 'pr' ? `GitHub PR: ${repo}#${number}` : `GitHub: ${repo}#${number}`
  return ['---', label, url].join('\n')
}
