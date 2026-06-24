import type { Composio } from "@composio/core"
import { executeTool } from "./composio.js"
import {
  type AiActivitySummary,
  type CommitDiff,
  generateAiActivitySummary,
} from "./github_ai_summary.js"
import {
  renderAtAGlancePanel,
  renderDashboardEmail,
  renderDashboardPanel,
  renderDataTable,
  renderEmphasis,
  renderInlineMarkdown,
  renderMuted,
  renderStatCards,
  stripMarkdown,
} from "./transactional_email.js"

const HOURS_BACK = Number(process.env.GITHUB_ACTIVITY_HOURS ?? 24)
const MAX_REPOS = Number(process.env.GITHUB_ACTIVITY_MAX_REPOS ?? 10)
const MAX_COMMITS_PER_REPO = Number(process.env.GITHUB_ACTIVITY_MAX_COMMITS ?? 5)

interface GitHubUser {
  login: string
  html_url: string
  public_repos: number
  owned_private_repos: number
}

interface GitHubRepo {
  full_name: string
  html_url: string
  pushed_at: string
  open_issues_count: number
  language: string | null
}

interface GitHubCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { date: string; name: string }
  }
  author: { login: string } | null
}

interface CommitFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

interface CommitDetailResponse {
  sha?: string
  stats?: { additions?: number; deletions?: number; total?: number }
  files?: CommitFile[]
  commit?: { author?: { date?: string } }
}

export interface GitHubActivitySummary {
  subject: string
  html: string
  plainText: string
}

function sinceIso(hoursBack: number): string {
  return new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function reposResponse(data: unknown): GitHubRepo[] {
  const payload = data as { repositories?: GitHubRepo[] } | GitHubRepo[]
  if (Array.isArray(payload)) return payload
  return payload.repositories ?? []
}

function commitsResponse(data: unknown): GitHubCommit[] {
  const payload = data as { commits?: GitHubCommit[] } | GitHubCommit[]
  if (Array.isArray(payload)) return payload
  return payload.commits ?? []
}

function commitDetailResponse(data: unknown): CommitDetailResponse {
  return data as CommitDetailResponse
}

async function fetchCommitDiff(
  composio: Composio,
  repoFullName: string,
  commit: GitHubCommit,
): Promise<CommitDiff | null> {
  const [owner, repo] = repoFullName.split("/")
  try {
    const detail = commitDetailResponse(
      await executeTool<unknown>(composio, "GITHUB_GET_A_COMMIT", {
        owner,
        repo,
        ref: commit.sha,
      }),
    )

    const files = detail.files ?? []
    if (files.length === 0) return null

    return {
      repo: repoFullName,
      sha: commit.sha,
      date: formatDate(commit.commit.author.date),
      additions: detail.stats?.additions ?? files.reduce((sum, f) => sum + f.additions, 0),
      deletions: detail.stats?.deletions ?? files.reduce((sum, f) => sum + f.deletions, 0),
      files: files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })),
    }
  } catch {
    return null
  }
}

function renderChangesTimeline(diffs: CommitDiff[]): string {
  const rows = diffs.map((diff) => [
    renderMuted(diff.date),
    renderEmphasis(diff.repo.split("/")[1] ?? diff.repo),
    renderEmphasis(String(diff.files.length)),
    renderMuted(`+${diff.additions} / -${diff.deletions}`),
    renderMuted(
      diff.files
        .slice(0, 3)
        .map((f) => f.filename.split("/").pop() ?? f.filename)
        .join(", ") + (diff.files.length > 3 ? "…" : ""),
    ),
  ])

  return renderDataTable(["Time", "Repo", "Files", "Lines", "Touched"], rows)
}

function renderAiSummaryPanel(summary: AiActivitySummary): string {
  const bullets = summary.bullets.map((bullet) => renderInlineMarkdown(bullet))
  return renderAtAGlancePanel(renderInlineMarkdown(summary.headline), bullets)
}

function renderGitHubActivityEmail(options: {
  dateLabel: string
  windowLabel: string
  user: GitHubUser
  activeRepos: GitHubRepo[]
  commitDiffs: CommitDiff[]
  aiSummary: AiActivitySummary
}): string {
  const { dateLabel, windowLabel, user, activeRepos, commitDiffs, aiSummary } = options

  const totalCommits = commitDiffs.length
  const totalFiles = commitDiffs.reduce((sum, diff) => sum + diff.files.length, 0)
  const totalAdds = commitDiffs.reduce((sum, diff) => sum + diff.additions, 0)
  const openIssues = activeRepos.reduce((sum, repo) => sum + repo.open_issues_count, 0)

  const statsHtml = renderStatCards([
    { label: "Active Repos", value: String(activeRepos.length), detail: windowLabel },
    { label: "Commits", value: String(totalCommits), detail: "With diffs" },
    { label: "Files Changed", value: String(totalFiles), detail: `+${totalAdds} lines` },
    { label: "Open Issues", value: String(openIssues), detail: "Active repos" },
  ])

  const atAGlanceHtml = renderAiSummaryPanel(aiSummary)

  const reposPanel =
    activeRepos.length > 0
      ? renderDashboardPanel(
          "Active Repositories",
          renderDataTable(
            ["Repository", "Last Push", "Language", "Issues"],
            activeRepos.map((repo) => [
              renderEmphasis(repo.full_name),
              renderMuted(formatDate(repo.pushed_at)),
              repo.language ? renderEmphasis(repo.language) : renderMuted("—"),
              repo.open_issues_count ? renderEmphasis(String(repo.open_issues_count)) : renderMuted("0"),
            ]),
          ),
        )
      : renderDashboardPanel(
          "Active Repositories",
          `<p style="margin:0;">${renderMuted("No repositories with pushes in this window.")}</p>`,
        )

  const changesPanel =
    commitDiffs.length > 0
      ? renderDashboardPanel("Code Changes", renderChangesTimeline(commitDiffs))
      : renderDashboardPanel(
          "Code Changes",
          `<p style="margin:0;">${renderMuted("No analyzable diffs in this window.")}</p>`,
        )

  const bodyHtml = [reposPanel, changesPanel].join("")

  return renderDashboardEmail({
    eyebrow: "GitHub Activity",
    heading: dateLabel,
    subheading: `AI summary for @${user.login} · ${windowLabel}`,
    statsHtml,
    atAGlanceHtml,
    bodyHtml,
    cta: { label: "View on GitHub", href: user.html_url },
    footer: "The Deployment Company · AI-powered GitHub activity summary",
  })
}

function buildPlainText(options: {
  dateLabel: string
  windowLabel: string
  user: GitHubUser
  activeRepos: GitHubRepo[]
  commitDiffs: CommitDiff[]
  aiSummary: AiActivitySummary
}): string {
  const { dateLabel, windowLabel, user, activeRepos, commitDiffs, aiSummary } = options

  const lines: string[] = [
    `GitHub Activity — ${dateLabel}`,
    "",
    "At a glance:",
    aiSummary.headline,
    ...aiSummary.bullets.map((bullet) => `  • ${stripMarkdown(bullet)}`),
    "",
    `Account: ${user.login} (${user.html_url})`,
    `Window: ${windowLabel}`,
    "",
  ]

  if (activeRepos.length > 0) {
    lines.push(`Active repositories (${activeRepos.length})`)
    for (const repo of activeRepos) {
      lines.push(
        `  • ${repo.full_name} — pushed ${formatDate(repo.pushed_at)}` +
          (repo.language ? ` · ${repo.language}` : "") +
          (repo.open_issues_count ? ` · ${repo.open_issues_count} open issues` : ""),
      )
    }
    lines.push("")
  }

  if (commitDiffs.length > 0) {
    lines.push("Code changes", "")
    for (const diff of commitDiffs) {
      lines.push(
        `  • ${diff.repo} @ ${diff.sha.slice(0, 7)} — ${diff.files.length} files (+${diff.additions}/-${diff.deletions})`,
      )
      for (const file of diff.files.slice(0, 5)) {
        lines.push(`      - ${file.status} ${file.filename}`)
      }
    }
    lines.push("")
  }

  return lines.join("\n")
}

export async function generateGitHubActivitySummary(
  composio: Composio,
): Promise<GitHubActivitySummary> {
  const since = sinceIso(HOURS_BACK)
  const windowLabel = HOURS_BACK === 24 ? "last 24 hours" : `last ${HOURS_BACK} hours`

  const user = await executeTool<GitHubUser>(
    composio,
    "GITHUB_GET_THE_AUTHENTICATED_USER",
  )

  const reposData = await executeTool<unknown>(
    composio,
    "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
    { sort: "pushed", per_page: 100, type: "all" },
  )

  const sinceMs = Date.parse(since)
  const activeRepos = reposResponse(reposData)
    .filter((repo) => Date.parse(repo.pushed_at) >= sinceMs)
    .slice(0, MAX_REPOS)

  const commitDiffs: CommitDiff[] = []
  for (const repo of activeRepos) {
    const [owner, name] = repo.full_name.split("/")
    try {
      const commitsData = await executeTool<unknown>(composio, "GITHUB_LIST_COMMITS", {
        owner,
        repo: name,
        since,
        per_page: MAX_COMMITS_PER_REPO,
      })
      const commits = commitsResponse(commitsData)

      for (const commit of commits) {
        if (!commit.sha) continue
        const diff = await fetchCommitDiff(composio, repo.full_name, commit)
        if (diff) commitDiffs.push(diff)
      }
    } catch {
      // Skip repos we can't read.
    }
  }

  console.log(`  🤖 Analyzing ${commitDiffs.length} commit diff(s) with AI...\n`)

  const aiSummary = await generateAiActivitySummary({
    username: user.login,
    windowLabel,
    diffs: commitDiffs,
  })

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const content = {
    dateLabel,
    windowLabel,
    user,
    activeRepos,
    commitDiffs,
    aiSummary,
  }

  return {
    subject: `GitHub Activity — ${user.login} — ${dateLabel}`,
    html: renderGitHubActivityEmail(content),
    plainText: buildPlainText(content),
  }
}
