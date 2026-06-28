import { GitHubApiError } from '../github.js'

export interface GitHubIssueLabel {
  name: string
}

export interface GitHubIssueMilestone {
  title: string
  due_on: string | null
}

export interface GitHubIssueRaw {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  labels: GitHubIssueLabel[]
  milestone: GitHubIssueMilestone | null
  pull_request?: { url: string }
  updated_at: string
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Nexus-Student-OS',
  }
}

export async function fetchRepoIssuesPage(
  token: string,
  repoFullName: string,
  page: number,
  perPage: number,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<{ issues: GitHubIssueRaw[]; hasMore: boolean }> {
  const [owner, repo] = repoFullName.split('/')
  if (!owner || !repo) {
    throw new GitHubApiError(400, `Invalid repo: ${repoFullName}`)
  }

  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`)
  url.searchParams.set('state', state)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', 'updated')
  url.searchParams.set('direction', 'desc')

  const res = await fetch(url.toString(), { headers: githubHeaders(token) })
  if (!res.ok) {
    throw new GitHubApiError(res.status, await res.text())
  }

  const rows = (await res.json()) as GitHubIssueRaw[]
  const issues = rows.filter((row) => !row.pull_request)
  const link = res.headers.get('Link') ?? ''
  const hasMore = link.includes('rel="next"')

  return { issues, hasMore }
}

export async function fetchAllOpenRepoIssues(
  token: string,
  repoFullName: string,
  maxPages = 10
): Promise<GitHubIssueRaw[]> {
  const all: GitHubIssueRaw[] = []
  let page = 1

  while (page <= maxPages) {
    const { issues, hasMore } = await fetchRepoIssuesPage(token, repoFullName, page, 100, 'open')
    all.push(...issues)
    if (!hasMore) break
    page++
  }

  return all
}
