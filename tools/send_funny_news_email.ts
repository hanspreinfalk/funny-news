import "dotenv/config"
import { Composio } from "@composio/core"
import * as fs from "fs"
import { generateFunnyNewsBriefing, stripMarkdownBold } from "./lib/funny_news.js"

const RECIPIENT = process.env.FUNNY_NEWS_RECIPIENT ?? "startup290702@gmail.com"
const USER_ID = process.env.COMPOSIO_USER_ID ?? "funny-news"

async function ensureGmailConnected(composio: Composio): Promise<void> {
  const accounts = await composio.connectedAccounts.list({
    userIds: [USER_ID],
    toolkitSlugs: ["gmail"],
    statuses: ["ACTIVE"],
  })

  if (accounts.items.length === 0) {
    throw new Error(
      `No active Gmail connection for user "${USER_ID}". ` +
        "Connect Gmail once with: npm run tool tools/connect_gmail.ts",
    )
  }
}

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is required")
  }

  console.log(`\n  🔍 Generating funny news briefing...\n`)

  const { briefing, pdfPath } = await generateFunnyNewsBriefing()

  try {
    const composio = new Composio({
      apiKey,
      dangerouslyAllowAutoUploadDownloadFiles: true,
    })

    await ensureGmailConnected(composio)

    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })

    console.log(`  📧 Sending to ${RECIPIENT}...\n`)

    await composio.tools.execute("GMAIL_SEND_EMAIL", {
      userId: USER_ID,
      arguments: {
        recipient_email: RECIPIENT,
        subject: `The Tech Roast — ${date}`,
        body: stripMarkdownBold(briefing),
        attachment: pdfPath,
      },
    })

    console.log(briefing)
    console.log(`\n  ✅ Email sent to ${RECIPIENT}`)
  } finally {
    fs.unlinkSync(pdfPath)
  }
}

main().catch((err) => {
  console.error("  Something broke:", err instanceof Error ? err.message : err)
  process.exit(1)
})
