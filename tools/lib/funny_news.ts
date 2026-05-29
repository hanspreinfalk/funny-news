import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import PDFDocument from "pdfkit"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

export interface Article {
  title: string
  source: string
  date: string
}

export interface BriefingResult {
  briefing: string
  pdfPath: string
}

export const DEFAULT_TOPIC = "tech"
export const DEFAULT_COUNT = 5
export const DEFAULT_TONE = "mild"

interface TextSegment {
  text: string
  bold: boolean
}

function parseBoldSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const regex = /\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false })
    }
    segments.push({ text: match[1], bold: true })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false })
  }

  return segments.length > 0 ? segments : [{ text, bold: false }]
}

function writeFormattedBriefing(
  doc: PDFKit.PDFDocument,
  text: string,
  options: PDFKit.Mixins.TextOptions = {},
) {
  const paragraphs = text.split(/\n\n+/)

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const segments = parseBoldSegments(paragraph)

    segments.forEach((segment, segmentIndex) => {
      doc
        .font(segment.bold ? "Helvetica-Bold" : "Helvetica")
        .text(segment.text, {
          ...options,
          continued: segmentIndex < segments.length - 1,
        })
    })

    if (paragraphIndex < paragraphs.length - 1) {
      doc.moveDown()
    }
  })
}

function parseRSSItems(xml: string): Article[] {
  const items: Article[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1]
    const title = content.match(/<title>(.*?)<\/title>/)?.[1] ?? ""
    const source = content.match(/<source>(.*?)<\/source>/)?.[1] ?? "Unknown"
    const date = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ""
    items.push({ title, source, date })
  }

  return items
}

export async function fetchNewsHeadlines(topic: string, count: number): Promise<Article[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
  const res = await fetch(url)
  const xml = await res.text()
  const items = parseRSSItems(xml)
  return items.slice(0, count)
}

export async function generateFunnyBriefing(
  topic: string,
  articles: Article[],
  tone: string,
): Promise<string> {
  const headlines = articles
    .map((a, i) => `${i + 1}. "${a.title}" — ${a.source} (${a.date})`)
    .join("\n")

  const systemPrompt = tone === "full-drag"
    ? "You are a brutally sarcastic news commentator. Your job is to take news headlines and absolutely roast them. Be savage, witty, and devastatingly funny. No topic is sacred. Go for the jugular."
    : "You are a witty, sarcastic news commentator. Your job is to take news headlines and retell them with clever humor and light roasting. Be funny but not cruel. Think John Oliver meets a Twitter shitposter."

  const userPrompt = `Here are the latest news stories about "${topic}":

${headlines}

Write a hilarious, sarcastic news briefing covering these stories. Structure it like:
- A hook intro line
- Each story retold with a comedic twist
- A "burn of the day" closing line

Use **double asterisks** around punchlines or key phrases for emphasis. Make it genuinely funny. Roast the stories, not the readers.`

  const { text } = await generateText({
    model: google("gemini-2.0-flash-001"),
    system: systemPrompt,
    prompt: userPrompt,
  })

  return text
}

export function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1")
}

export async function createBriefingPdf(briefing: string): Promise<string> {
  const pdfPath = path.join(os.tmpdir(), `funny-news-${Date.now()}.pdf`)
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    info: {
      Title: `Funny Tech News Briefing — ${new Date().toLocaleDateString()}`,
      Author: "WAT Framework",
    },
  })

  const stream = fs.createWriteStream(pdfPath)
  doc.pipe(stream)

  doc.fontSize(22).font("Helvetica-Bold").text("The Tech Roast", { align: "center" })
  doc.fontSize(12).font("Helvetica").fillColor("#6B7280").text(
    `Your sarcastic briefing for ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    { align: "center" },
  )
  doc.moveDown(2)

  doc.fontSize(11).fillColor("#111827")
  writeFormattedBriefing(doc, briefing, { align: "left", lineGap: 6 })

  doc.end()
  await new Promise<void>((resolve) => stream.on("finish", resolve))

  return pdfPath
}

export async function generateFunnyNewsBriefing(options?: {
  topic?: string
  count?: number
  tone?: string
}): Promise<BriefingResult> {
  const topic = options?.topic ?? DEFAULT_TOPIC
  const count = options?.count ?? DEFAULT_COUNT
  const tone = options?.tone ?? DEFAULT_TONE

  const articles = await fetchNewsHeadlines(topic, count)
  if (articles.length === 0) {
    throw new Error("No news articles found for this topic.")
  }

  const briefing = await generateFunnyBriefing(topic, articles, tone)
  const pdfPath = await createBriefingPdf(briefing)

  return { briefing, pdfPath }
}
