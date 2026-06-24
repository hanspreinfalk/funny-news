export interface TransactionalEmailOptions {
  eyebrow: string
  heading: string
  bodyHtml: string
  cta?: { label: string; href: string }
  footer?: string
  maxWidth?: number
}

export interface DashboardEmailOptions {
  eyebrow: string
  heading: string
  subheading?: string
  statsHtml: string
  atAGlanceHtml?: string
  bodyHtml: string
  cta?: { label: string; href: string }
  footer?: string
  maxWidth?: number
}

export interface StatCard {
  label: string
  value: string
  detail?: string
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
const DEFAULT_MAX_WIDTH = 400
const DASHBOARD_MAX_WIDTH = 680

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderCta(cta: { label: string; href: string }): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
    <tr>
      <td align="center">
        <a href="${escapeHtml(cta.href)}" style="display:block;width:100%;box-sizing:border-box;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;line-height:1;padding:10px 16px;border-radius:6px;text-align:center;">${escapeHtml(cta.label)}</a>
      </td>
    </tr>
  </table>`
}

function renderFooter(footer: string): string {
  return `<tr>
    <td style="text-align:center;padding-top:24px;font-size:13px;line-height:1.5;color:#6b7280;">
      ${footer}
    </td>
  </tr>`
}

function renderBrandHeader(): string {
  return `<tr>
    <td style="text-align:center;padding-bottom:24px;">
      <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#111827;">The Deployment Company</span>
    </td>
  </tr>`
}

function renderEmailShell(options: {
  title: string
  maxWidth: number
  cardPadding: string
  headerHtml: string
  bodyHtml: string
  cta?: { label: string; href: string }
  footer?: string
}): string {
  const { title, maxWidth, cardPadding, headerHtml, bodyHtml, cta, footer } = options
  const ctaHtml = cta ? renderCta(cta) : ""
  const footerHtml = footer ? renderFooter(footer) : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:#f4f4f5;font-family:${FONT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;margin:0 auto;">
    ${renderBrandHeader()}
    <tr>
      <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:${cardPadding};">
        ${headerHtml}
        ${bodyHtml}
        ${ctaHtml}
      </td>
    </tr>
    ${footerHtml}
  </table>
</body>
</html>`
}

export function renderTransactionalEmail(options: TransactionalEmailOptions): string {
  const { eyebrow, heading, bodyHtml, cta, footer, maxWidth = DEFAULT_MAX_WIDTH } = options

  const headerHtml = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">${escapeHtml(eyebrow)}</p>
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;color:#111827;">${escapeHtml(heading)}</h1>
    <div style="font-size:14px;line-height:1.5;color:#4b5563;">`

  const closingHtml = `</div>`

  return renderEmailShell({
    title: heading,
    maxWidth,
    cardPadding: "20px 24px",
    headerHtml: headerHtml + bodyHtml + closingHtml,
    bodyHtml: "",
    cta,
    footer,
  })
}

export function renderDashboardEmail(options: DashboardEmailOptions): string {
  const {
    eyebrow,
    heading,
    subheading,
    statsHtml,
    atAGlanceHtml = "",
    bodyHtml,
    cta,
    footer,
    maxWidth = DASHBOARD_MAX_WIDTH,
  } = options

  const subheadingHtml = subheading
    ? `<p style="margin:4px 0 0;font-size:14px;line-height:1.5;color:#6b7280;">${subheading}</p>`
    : ""

  const atAGlanceBlock = atAGlanceHtml
    ? `<div style="margin-bottom:24px;">${atAGlanceHtml}</div>`
    : ""

  const headerHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
      <tr>
        <td style="vertical-align:top;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0;font-size:20px;font-weight:600;line-height:1.3;color:#111827;">${escapeHtml(heading)}</h1>
          ${subheadingHtml}
        </td>
      </tr>
    </table>
    ${statsHtml}
    ${atAGlanceBlock}
    <div style="font-size:14px;line-height:1.5;color:#4b5563;">`

  const closingHtml = `</div>`

  return renderEmailShell({
    title: heading,
    maxWidth,
    cardPadding: "24px 28px",
    headerHtml: headerHtml + bodyHtml + closingHtml,
    bodyHtml: "",
    cta,
    footer,
  })
}

export function renderStatCards(cards: StatCard[]): string {
  const width = Math.floor(100 / cards.length)
  const cells = cards
    .map((card, index) => {
      const paddingLeft = index === 0 ? "0" : "6px"
      const paddingRight = index === cards.length - 1 ? "0" : "6px"
      const detail = card.detail
        ? `<p style="margin:4px 0 0;font-size:12px;line-height:1.4;color:#6b7280;">${escapeHtml(card.detail)}</p>`
        : ""

      return `<td width="${width}%" style="padding:0 ${paddingRight} 0 ${paddingLeft};vertical-align:top;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">${escapeHtml(card.label)}</p>
              <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:600;letter-spacing:0.04em;line-height:1;color:#111827;">${escapeHtml(card.value)}</p>
              ${detail}
            </td>
          </tr>
        </table>
      </td>`
    })
    .join("")

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
    <tr>${cells}</tr>
  </table>`
}

export function renderDashboardPanel(title: string, contentHtml: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
    <tr>
      <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">${escapeHtml(title)}</p>
        ${contentHtml}
      </td>
    </tr>
  </table>`
}

export function renderTwoColumn(leftHtml: string, rightHtml: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td width="58%" style="padding-right:8px;vertical-align:top;">
        ${leftHtml}
      </td>
      <td width="42%" style="padding-left:8px;vertical-align:top;">
        ${rightHtml}
      </td>
    </tr>
  </table>`
}

export function renderSectionEyebrow(label: string): string {
  return `<p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">${escapeHtml(label)}</p>`
}

export function renderEmphasis(text: string): string {
  return `<span style="color:#111827;font-weight:500;">${escapeHtml(text)}</span>`
}

export function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1")
}

export function renderInlineMarkdown(text: string): string {
  const labelMatch = text.match(/^\*\*([^*]+)\*\*:\s*(.*)$/s)
  if (labelMatch) {
    return `<strong style="color:#111827;font-weight:600;">${escapeHtml(labelMatch[1])}:</strong> ${renderInlineMarkdownBody(labelMatch[2])}`
  }
  return renderInlineMarkdownBody(text)
}

function renderInlineMarkdownBody(text: string): string {
  const segments: Array<{ text: string; bold: boolean }> = []
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

  if (segments.length === 0) {
    return escapeHtml(text)
  }

  return segments
    .map((segment) =>
      segment.bold
        ? `<strong style="color:#111827;font-weight:600;">${escapeHtml(segment.text)}</strong>`
        : escapeHtml(segment.text),
    )
    .join("")
}

export function renderMuted(text: string): string {
  return `<span style="color:#6b7280;">${escapeHtml(text)}</span>`
}

export function renderListItem(text: string): string {
  return `<tr>
    <td style="padding:0 0 10px 0;font-size:14px;line-height:1.5;color:#4b5563;vertical-align:top;">
      <span style="color:#6b7280;">&bull;</span>&nbsp;${text}
    </td>
  </tr>`
}

export function renderList(items: string[]): string {
  if (items.length === 0) return ""
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
    ${items.map(renderListItem).join("")}
  </table>`
}

export function renderCaptureCode(value: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
    <tr>
      <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:600;letter-spacing:0.08em;color:#111827;">${escapeHtml(value)}</span>
      </td>
    </tr>
  </table>`
}

export function renderDataTable(headers: string[], rows: string[][]): string {
  const headerCells = headers
    .map(
      (header) =>
        `<th align="left" style="padding:0 12px 10px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:1px solid #e5e7eb;">${escapeHtml(header)}</th>`,
    )
    .join("")

  const bodyRows = rows
    .map((row) => {
      const cells = row
        .map(
          (cell, index) =>
            `<td style="padding:10px 12px 10px 0;font-size:14px;line-height:1.4;color:#4b5563;${index === 0 ? "color:#111827;font-weight:500;" : ""}vertical-align:top;border-bottom:1px solid #f3f4f6;">${cell}</td>`,
        )
        .join("")
      return `<tr>${cells}</tr>`
    })
    .join("")

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`
}

export function renderAtAGlancePanel(summaryHtml: string, bullets: string[]): string {
  const bulletItems = bullets
    .map(
      (bullet) =>
        `<tr>
          <td style="padding:0 0 10px 0;vertical-align:top;width:20px;font-size:14px;color:#111827;">&#10003;</td>
          <td style="padding:0 0 12px 8px;font-size:14px;line-height:1.55;color:#4b5563;">${bullet}</td>
        </tr>`,
    )
    .join("")

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
    <tr>
      <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:18px 20px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">At a Glance</p>
        <p style="margin:0 0 14px;font-size:16px;font-weight:600;line-height:1.5;color:#111827;">${summaryHtml}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${bulletItems}
        </table>
      </td>
    </tr>
  </table>`
}
