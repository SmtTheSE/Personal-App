import { GitHubApiError } from '../github.js'
import type { GitHubIssueLabel } from './issuesClient.js'

export interface GitHubPRRaw {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  draft: boolean
  user: { login: string }
  requested_reviewers?: { login: string }[]
  labels: GitHubIssueLabel[]
  updated_at: string
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Nexus-Student-OS',
  }
}

export async function fetchRepoPullsPage(
  token: string,
  repoFullName: string,
  page: number,
  perPage: number,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<{ pulls: GitHubPRRaw[]; hasMore: boolean }> {
  const [owner, repo] = repoFullName.split('/')
  if (!owner || !repo) {
    throw new GitHubApiError(400, `Invalid repo: ${repoFullName}`)
  }

  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`)
  url.searchParams.set('state', state)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', 'updated')
  url.searchParams.set('direction', 'desc')

  const res = await fetch(url.toString(), { headers: githubHeaders(token) })
  if (!res.ok) {
    throw new GitHubApiError(res.status, await res.text())
  }

  const pulls = (await res.json()) as GitHubPRRaw[]
  const link = res.headers.get('Link') ?? ''
  const hasMore = link.includes('rel="next"')

  return { pulls, hasMore }
}

export async function fetchAllOpenRepoPulls(
  token: string,
  repoFullName: string,
  maxPages = 10
): Promise<GitHubPRRaw[]> {
  const all: GitHubPRRaw[] = []
  let page = 1

  while (page <= maxPages) {
    const { pulls, hasMore } = await fetchRepoPullsPage(token, repoFullName, page, 100, 'open')
    all.push(...pulls.filter((pr) => !pr.draft))
    if (!hasMore) break
    page++
  }

  return all
}

export async function fetchGitHubUsername(token: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/user', { headers: githubHeaders(token) })
  if (!res.ok) return null
  const body = (await res.json()) as { login?: string }
  return body.login ?? null
}
