# first-workflow

AI-powered GitHub activity email built on the [WAT framework](AGENTS.md) — workflows define the process, agents coordinate, and TypeScript tools do the execution.

## How it works

```
GitHub (Composio)  →  Gemini (AI SDK)  →  HTML email  →  Gmail (Composio)
   (commits/diffs)      (code summary)      (dashboard)
```

1. **Fetch** — Pulls recent commits and full diffs from GitHub via Composio.
2. **Analyze** — Sends diffs to Gemini for a summary of what actually changed in the code.
3. **Format** — Renders a branded HTML dashboard email.
4. **Deliver** — Sends via Gmail through [Composio](https://composio.dev).

The full workflow spec lives in [`workflows/github_activity_email.md`](workflows/github_activity_email.md).

## Project structure

| Path | Purpose |
|------|---------|
| `workflows/github_activity_email.md` | SOP — objective, steps, edge cases |
| `tools/lib/github_activity.ts` | Core logic: fetch activity, build HTML email |
| `tools/lib/github_ai_summary.ts` | Gemini diff analysis |
| `tools/send_github_activity_email.ts` | End-to-end script: fetch, summarize, send |
| `tools/connect_github.ts` | One-time GitHub OAuth setup via Composio |
| `tools/connect_gmail.ts` | One-time Gmail OAuth setup via Composio |
| `.github/workflows/github-activity-email.yml` | Manual GitHub activity email via `workflow_dispatch` |

## Setup

### Prerequisites

- Node.js 22+
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- A [Composio](https://composio.dev) account with GitHub and Gmail enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in values:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
COMPOSIO_API_KEY=your-composio-key
COMPOSIO_USER_ID=funny-news
ACTIVITY_EMAIL_RECIPIENT=you@example.com
```

### 3. Connect GitHub and Gmail (one time)

```bash
npm run tool tools/connect_github.ts
npm run tool tools/connect_gmail.ts
```

Open each printed URL, authorize the account, and wait for the connection to complete.

## Run locally

```bash
npm run tool tools/send_github_activity_email.ts
```

You'll get an HTML dashboard email summarizing recent GitHub activity.

## GitHub Actions

Run manually from the Actions tab via **workflow_dispatch** (`.github/workflows/github-activity-email.yml`).

Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `COMPOSIO_API_KEY` | Composio API key |
| `COMPOSIO_USER_ID` | Composio user ID (must match GitHub + Gmail connections) |
| `ACTIVITY_EMAIL_RECIPIENT` | Email address to receive the activity summary |

GitHub and Gmail must both be connected for `COMPOSIO_USER_ID` in Composio before CI can send mail.
