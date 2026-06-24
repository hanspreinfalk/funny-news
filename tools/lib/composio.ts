import { Composio } from "@composio/core"

export const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID ?? "funny-news"

export function getComposioClient(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is required")
  }
  return new Composio({ apiKey })
}

export async function ensureToolkitConnected(
  composio: Composio,
  toolkit: "github" | "gmail",
): Promise<void> {
  const accounts = await composio.connectedAccounts.list({
    userIds: [COMPOSIO_USER_ID],
    toolkitSlugs: [toolkit],
    statuses: ["ACTIVE"],
  })

  if (accounts.items.length === 0) {
    const script =
      toolkit === "github" ? "tools/connect_github.ts" : "tools/connect_gmail.ts"
    throw new Error(
      `No active ${toolkit} connection for user "${COMPOSIO_USER_ID}". ` +
        `Connect once with: npm run tool ${script}`,
    )
  }
}

export async function executeTool<T>(
  composio: Composio,
  slug: string,
  arguments_: Record<string, unknown> = {},
): Promise<T> {
  const result = await composio.tools.execute(slug, {
    userId: COMPOSIO_USER_ID,
    dangerouslySkipVersionCheck: true,
    arguments: arguments_,
  })
  return result.data as T
}
