import "dotenv/config"
import {
  COMPOSIO_USER_ID,
  ensureToolkitConnected,
  getComposioClient,
} from "./lib/composio.js"
import { generateGitHubActivitySummary } from "./lib/github_activity.js"

const RECIPIENT =
  process.env.ACTIVITY_EMAIL_RECIPIENT ?? "hans.preinfalk.davila@gmail.com"

async function main() {
  console.log(`\n  🔍 Fetching GitHub activity for user "${COMPOSIO_USER_ID}"...\n`)

  const composio = getComposioClient()
  await ensureToolkitConnected(composio, "github")
  await ensureToolkitConnected(composio, "gmail")

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is required. Add it to .env for AI code analysis summaries.",
    )
  }

  const { subject, html, plainText } = await generateGitHubActivitySummary(composio)

  console.log(`  📧 Sending to ${RECIPIENT}...\n`)

  await composio.tools.execute("GMAIL_SEND_EMAIL", {
    userId: COMPOSIO_USER_ID,
    dangerouslySkipVersionCheck: true,
    arguments: {
      recipient_email: RECIPIENT,
      subject,
      body: html,
      is_html: true,
    },
  })

  console.log(plainText)
  console.log(`\n  ✅ Email sent to ${RECIPIENT}`)
}

main().catch((err) => {
  console.error("  Something broke:", err instanceof Error ? err.message : err)
  process.exit(1)
})
