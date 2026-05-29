# funny-news

A daily tech news briefing that roasts the headlines and emails them to your inbox. Built on the [WAT framework](AGENTS.md) — workflows define the process, agents coordinate, and TypeScript tools do the execution.

## How it works

```
Google News RSS  →  Gemini (AI SDK)  →  PDF  →  Gmail (Composio)
   (headlines)        (sarcastic           (attachment)
                       rewrite)
```

1. **Fetch** — Pulls the latest tech headlines from Google News RSS.
2. **Roast** — Sends them to Google Gemini, which rewrites each story with sarcastic commentary.
3. **Format** — Renders the briefing as a styled PDF ("The Tech Roast").
4. **Deliver** — Emails the briefing body + PDF attachment via Gmail through [Composio](https://composio.dev).

By default it covers **5 tech stories** with **mild sarcasm**. The full workflow spec lives in [`workflows/funny_news_briefing.md`](workflows/funny_news_briefing.md).

## Project structure

| Path | Purpose |
|------|---------|
| `workflows/funny_news_briefing.md` | SOP — objective, steps, edge cases |
| `tools/lib/funny_news.ts` | Core logic: RSS fetch, AI generation, PDF creation |
| `tools/send_funny_news_email.ts` | End-to-end script: generate briefing and send email |
| `tools/connect_gmail.ts` | One-time Gmail OAuth setup via Composio |
| `.github/workflows/daily-news.yml` | Scheduled daily run at 9:00 AM Pacific |

## Setup

### Prerequisites

- Node.js 22+
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- A [Composio](https://composio.dev) account with Gmail enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
COMPOSIO_API_KEY=your-composio-key
COMPOSIO_USER_ID=funny-news
FUNNY_NEWS_RECIPIENT=you@example.com
```

`COMPOSIO_GMAIL_AUTH_CONFIG_ID` is optional — if unset, the connect script picks the first Gmail auth config from your Composio dashboard.

### 3. Connect Gmail (one time)

```bash
npm run tool tools/connect_gmail.ts
```

Open the printed URL, authorize Gmail, and wait for the connection to complete.

## Run locally

```bash
npm run tool tools/send_funny_news_email.ts
```

You'll get an email with the briefing in the body and a PDF attachment titled **The Tech Roast**.

## Automated daily delivery

GitHub Actions runs the briefing every day at **9:00 AM Pacific** (`.github/workflows/daily-news.yml`). You can also trigger it manually from the Actions tab or via `workflow_dispatch`.

Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `COMPOSIO_API_KEY` | Composio API key |
| `COMPOSIO_USER_ID` | Composio user ID (must match the Gmail connection) |
| `FUNNY_NEWS_RECIPIENT` | Email address to receive the briefing |

Gmail only needs to be connected once through Composio — the same connection is reused by CI.
