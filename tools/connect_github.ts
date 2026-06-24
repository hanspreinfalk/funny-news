import "dotenv/config"
import { COMPOSIO_USER_ID, getComposioClient } from "./lib/composio.js"

async function resolveGithubAuthConfigId(
  composio: ReturnType<typeof getComposioClient>,
): Promise<string> {
  const fromEnv = process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID
  if (fromEnv) return fromEnv

  const configs = await composio.authConfigs.list({ toolkit: "github" })
  const config = configs.items[0]
  if (!config) {
    throw new Error(
      "No GitHub auth config found. Create one in the Composio dashboard " +
        "or set COMPOSIO_GITHUB_AUTH_CONFIG_ID in .env",
    )
  }

  return config.id
}

async function main() {
  const composio = getComposioClient()

  const existing = await composio.connectedAccounts.list({
    userIds: [COMPOSIO_USER_ID],
    toolkitSlugs: ["github"],
    statuses: ["ACTIVE"],
  })

  if (existing.items.length > 0) {
    console.log(`\n  ✅ GitHub already connected for user "${COMPOSIO_USER_ID}"\n`)
    return
  }

  const authConfigId = await resolveGithubAuthConfigId(composio)
  const request = await composio.connectedAccounts.link(COMPOSIO_USER_ID, authConfigId)

  console.log(`\n  Open this URL to connect GitHub:\n\n  ${request.redirectUrl}\n`)
  console.log("  Waiting for connection (up to 5 minutes)...\n")

  await request.waitForConnection(300_000)

  console.log(`  ✅ GitHub connected for user "${COMPOSIO_USER_ID}"\n`)
}

main().catch((err) => {
  console.error("  Something broke:", err instanceof Error ? err.message : err)
  process.exit(1)
})
