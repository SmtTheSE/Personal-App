export interface GitHubRepoRaw {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  private: boolean
  updated_at: string
  language: string | null
  stargazers_count: number
  default_branch: string
}

const REPOS_BASE =
  'https://api.github.com/user/repos?sort=updated&affiliation=owner,collaborator,organization_member'

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Nexus-Student-OS',
  }
}

export function mapGitHubRepo(r: GitHubRepoRaw) {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description,
    private: r.private,
    updated_at: r.updated_at,
    language: r.language,
    stargazers_count: r.stargazers_count,
    default_branch: r.default_branch,
  }
}

export class GitHubApiError extends Error {
  status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}

export async function fetchGitHubReposPage(
  token: string,
  page: number,
  perPage: number
): Promise<{ repos: GitHubRepoRaw[]; hasMore: boolean }> {
  const res = await fetch(`${REPOS_BASE}&per_page=${perPage}&page=${page}`, {
    headers: githubHeaders(token),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new GitHubApiError(res.status, detail)
  }

  const repos = (await res.json()) as GitHubRepoRaw[]
  const link = res.headers.get('Link') ?? ''
  const hasMore = link.includes('rel="next"')

  return { repos, hasMore }
}

export async function fetchAllGitHubRepos(
  token: string,
  maxPages = 20
): Promise<GitHubRepoRaw[]> {
  const all: GitHubRepoRaw[] = []
  let page = 1

  while (page <= maxPages) {
    const { repos, hasMore } = await fetchGitHubReposPage(token, page, 100)
    all.push(...repos)
    if (!hasMore) break
    page++
  }

  return all
}
