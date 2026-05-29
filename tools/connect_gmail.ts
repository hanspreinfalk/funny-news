import "dotenv/config"
import { Composio } from "@composio/core"

const USER_ID = process.env.COMPOSIO_USER_ID ?? "funny-news"

async function resolveGmailAuthConfigId(composio: Composio): Promise<string> {
  const fromEnv = process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID
  if (fromEnv) return fromEnv

  const configs = await composio.authConfigs.list({ toolkit: "gmail" })
  const config = configs.items[0]
  if (!config) {
    throw new Error(
      "No Gmail auth config found. Create one in the Composio dashboard " +
        "or set COMPOSIO_GMAIL_AUTH_CONFIG_ID in .env",
    )
  }

  return config.id
}

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is required")
  }

  const composio = new Composio({ apiKey })

  const existing = await composio.connectedAccounts.list({
    userIds: [USER_ID],
    toolkitSlugs: ["gmail"],
    statuses: ["ACTIVE"],
  })

  if (existing.items.length > 0) {
    console.log(`\n  ✅ Gmail already connected for user "${USER_ID}"\n`)
    return
  }

  const authConfigId = await resolveGmailAuthConfigId(composio)
  const request = await composio.connectedAccounts.link(USER_ID, authConfigId)

  console.log(`\n  Open this URL to connect Gmail:\n\n  ${request.redirectUrl}\n`)
  console.log("  Waiting for connection (up to 5 minutes)...\n")

  await request.waitForConnection(300_000)

  console.log(`  ✅ Gmail connected for user "${USER_ID}"\n`)
}

main().catch((err) => {
  console.error("  Something broke:", err instanceof Error ? err.message : err)
  process.exit(1)
})
