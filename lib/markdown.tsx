/**
 * Markdown processing utility for newsletter content
 * Converts Markdown to HTML for email templates
 */

export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""

  let html = markdown

  // Headers
  html = html.replace(
    /^### (.*$)/gim,
    '<h3 style="margin: 20px 0 10px 0; color: #1f2937; font-size: 18px; font-weight: 600;">$1</h3>',
  )
  html = html.replace(
    /^## (.*$)/gim,
    '<h2 style="margin: 25px 0 15px 0; color: #1f2937; font-size: 22px; font-weight: 600;">$1</h2>',
  )
  html = html.replace(
    /^# (.*$)/gim,
    '<h1 style="margin: 30px 0 20px 0; color: #1f2937; font-size: 26px; font-weight: 700;">$1</h1>',
  )

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600; color: #1f2937;">$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong style="font-weight: 600; color: #1f2937;">$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
  html = html.replace(/_(.+?)_/g, '<em style="font-style: italic;">$1</em>')

  // Images: ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]$$([^)]+)$$/g,
    '<div style="text-align: center; margin: 20px 0;"><img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /></div>',
  )

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]$$([^)]+)$$/g,
    '<a href="$2" style="color: #10b981; text-decoration: none; font-weight: 500; border-bottom: 1px solid #10b981;">$1</a>',
  )

  // Unordered lists
  html = html.replace(/^\* (.+)$/gim, '<li style="margin: 5px 0; color: #4b5563;">$1</li>')
  html = html.replace(/^- (.+)$/gim, '<li style="margin: 5px 0; color: #4b5563;">$1</li>')
  html = html.replace(
    /(<li.*<\/li>)/s,
    '<ul style="margin: 15px 0; padding-left: 25px; list-style-type: disc;">$1</ul>',
  )

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gim, '<li style="margin: 5px 0; color: #4b5563;">$1</li>')

  // Horizontal rule
  html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 25px 0;" />')

  // Paragraphs (double line breaks)
  const paragraphs = html.split(/\n\n+/)
  html = paragraphs
    .map((para) => {
      // Don't wrap if already wrapped in HTML tags
      if (para.trim().startsWith("<")) return para
      return `<p style="margin: 15px 0; line-height: 1.6; color: #4b5563;">${para.trim()}</p>`
    })
    .join("\n")

  // Single line breaks
  html = html.replace(/\n/g, "<br />")

  return html
}
