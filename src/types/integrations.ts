export interface GitHubRepo {
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

export type VercelDeploymentState = 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED' | string

export interface VercelDeployment {
  uid: string
  name: string
  state: VercelDeploymentState
  url: string | null
  created: number
  target: string | null
  meta?: {
    githubCommitMessage?: string
    githubCommitRef?: string
    githubRepo?: string
  }
}

export interface VercelProject {
  id: string
  name: string
  framework: string | null
  link?: {
    type?: string
    repo?: string
    repoId?: number
    org?: string
  }
  latestDeployment?: VercelDeployment | null
}

export interface LinkedRepo {
  repoFullName: string
  github?: GitHubRepo
  vercelProject?: VercelProject
  latestDeployment?: VercelDeployment | null
  onVercel: boolean
}

export interface GitHubReposPage {
  repos: GitHubRepo[]
  page: number
  per_page: number
  has_more: boolean
}

export interface DeploymentStats {
  totalDeploys: number
  successCount: number
  errorCount: number
  buildingCount: number
  successRate: number
  deploysByDay: Record<string, number>
}

export interface DeploymentDashboard {
  githubConnected: boolean
  vercelConnected: boolean
  repos: GitHubRepo[]
  projects: VercelProject[]
  deployments: VercelDeployment[]
  linked: LinkedRepo[]
  stats: DeploymentStats
}

export type IntegrationProvider = 'github' | 'vercel' | 'google_calendar'

export interface IntegrationStatus {
  provider: IntegrationProvider
  connected: boolean
  updated_at: string | null
  metadata: Record<string, unknown>
}
