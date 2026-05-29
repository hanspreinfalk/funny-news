# Funny News Briefing Workflow

## Objective
Scrape the latest news on a given topic and deliver them as a hilarious, sarcastic debrief. Uses AI SDK to roast the headlines so you stay informed without taking any of it seriously.

## Required Inputs
- None (hardcoded to "tech" news, 5 stories, mild sarcasm)

## Steps
1. Connect Gmail once (local or Composio dashboard): `npm run tool tools/connect_gmail.ts`
2. Run `tools/send_funny_news_email.ts`:
   ```
   npm run tool tools/send_funny_news_email.ts
   ```
3. The tool will:
   a. Search Google News RSS for the latest tech stories
   b. Feed the raw headlines into the AI SDK (Google Gemini)
   c. Get back a re-written briefing dripping with sarcasm and wit
   d. Email the briefing (with PDF attachment) via Composio/Gmail

Daily delivery is handled by `.github/workflows/daily-news.yml` at 9:00 AM Pacific.

## Output
Email to `startup290702@gmail.com` with:
- The briefing in the email body
- A PDF attachment of the formatted briefing

## Edge Cases
- If the web search returns no results, the tool should say "Nothing happened this week. Congrats, planet. You finally took a break."
- If the AI model refuses to be sarcastic, remind it that cynicism is a public service
- If the topic is too broad, the tool will focus on the most absurd stories it can find
- Requires `GOOGLE_GENERATIVE_AI_API_KEY`, `COMPOSIO_API_KEY`, and `COMPOSIO_USER_ID` in `.env`
