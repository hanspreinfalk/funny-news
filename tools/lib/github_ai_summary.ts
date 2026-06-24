import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export interface CommitFileChange {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

export interface CommitDiff {
  repo: string
  sha: string
  date: string
  additions: number
  deletions: number
  files: CommitFileChange[]
}

export interface AiActivitySummary {
  headline: string
  bullets: string[]
  narrative: string
}

const AI_MODEL = process.env.GITHUB_ACTIVITY_AI_MODEL ?? "gemini-2.5-flash"
const MAX_PATCH_CHARS_PER_FILE = 3_000
const MAX_TOTAL_DIFF_CHARS = 100_000
const MAX_FILES_WITH_PATCHES = 12

function truncatePatch(patch: string): string {
  if (patch.length <= MAX_PATCH_CHARS_PER_FILE) return patch
  return `${patch.slice(0, MAX_PATCH_CHARS_PER_FILE)}\n... [patch truncated]`
}

export function buildDiffContextForAi(diffs: CommitDiff[]): string {
  const sections: string[] = []
  let totalChars = 0

  for (const diff of diffs) {
    const fileLines: string[] = []
    let filesIncluded = 0

    for (const file of diff.files) {
      if (filesIncluded >= MAX_FILES_WITH_PATCHES) break
      if (!file.patch) {
        fileLines.push(
          `- ${file.status} ${file.filename} (+${file.additions}/-${file.deletions}, no patch)`,
        )
        filesIncluded++
        continue
      }

      const patch = truncatePatch(file.patch)
      const block = [
        `- ${file.status} ${file.filename} (+${file.additions}/-${file.deletions})`,
        "```diff",
        patch,
        "```",
      ].join("\n")

      if (totalChars + block.length > MAX_TOTAL_DIFF_CHARS) break

      fileLines.push(block)
      totalChars += block.length
      filesIncluded++
    }

    if (fileLines.length === 0) continue

    sections.push(
      [
        `## ${diff.repo} @ ${diff.sha.slice(0, 7)} (${diff.date})`,
        `Stats: +${diff.additions} / -${diff.deletions} across ${diff.files.length} file(s)`,
        ...fileLines,
      ].join("\n"),
    )
  }

  return sections.join("\n\n")
}

function parseAiSummary(text: string): AiActivitySummary {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        headline?: string
        bullets?: string[]
        narrative?: string
      }
      if (parsed.headline && Array.isArray(parsed.bullets)) {
        return {
          headline: parsed.headline.trim(),
          bullets: parsed.bullets.map((b) => String(b).trim()).filter(Boolean),
          narrative: (parsed.narrative ?? parsed.headline).trim(),
        }
      }
    } catch {
      // Fall through to plain-text parsing.
    }
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const headline = lines[0] ?? "GitHub activity summary"
  const bullets = lines
    .slice(1)
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .filter(Boolean)

  return {
    headline,
    bullets: bullets.length > 0 ? bullets : [headline],
    narrative: [headline, ...bullets].join("\n"),
  }
}

export async function generateAiActivitySummary(options: {
  username: string
  windowLabel: string
  diffs: CommitDiff[]
}): Promise<AiActivitySummary> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for AI activity summaries")
  }

  const { username, windowLabel, diffs } = options

  if (diffs.length === 0) {
    return {
      headline: `No code changes in the ${windowLabel}.`,
      bullets: ["No commits with analyzable diffs were found in this window."],
      narrative: `No code changes in the ${windowLabel}.`,
    }
  }

  const diffContext = buildDiffContextForAi(diffs)
  const totalFiles = diffs.reduce((sum, diff) => sum + diff.files.length, 0)
  const totalAdds = diffs.reduce((sum, diff) => sum + diff.additions, 0)
  const totalDels = diffs.reduce((sum, diff) => sum + diff.deletions, 0)

  const { text } = await generateText({
    model: google(AI_MODEL),
    system:
      "You write concise GitHub activity summaries for a developer dashboard email. " +
      "Analyze the provided code diffs and file changes only. " +
      "Do NOT rely on commit messages — they may be inaccurate or missing. " +
      "Explain what engineering work was actually done: features built, bugs fixed, refactors, tests added, config changes, etc. " +
      "Be specific about systems, modules, and behaviors changed. " +
      "Write in clear, professional plain English. Do not use Markdown formatting. " +
      "Return ONLY valid JSON with keys: headline (one sentence), bullets (3-6 strings; optional short label prefix like \"AI Grounding:\" then the detail).",
    prompt: `Developer: @${options.username}
Window: ${windowLabel}
Commits with diffs: ${diffs.length}
Files touched: ${totalFiles}
Line changes: +${totalAdds} / -${totalDels}

Code changes to analyze:

${diffContext}

Return JSON only.`,
  })

  return parseAiSummary(text)
}
