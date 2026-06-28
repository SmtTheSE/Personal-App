export function normalizeRepoList(repos: unknown): string[] {
  if (!Array.isArray(repos)) return []
  return [...new Set(repos.filter((r): r is string => typeof r === 'string' && r.includes('/')))]
}
