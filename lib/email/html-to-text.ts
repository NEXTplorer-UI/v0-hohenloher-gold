/**
 * Converts HTML content to plain text for multipart emails
 * Strips HTML tags while preserving structure and readability
 */
export function htmlToPlainText(html: string): string {
  let text = html

  // Remove script and style elements completely
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

  // Convert headings to uppercase with spacing
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n\n$1\n")

  // Convert paragraphs and divs to line breaks
  text = text.replace(/<\/p>/gi, "\n\n")
  text = text.replace(/<p[^>]*>/gi, "")
  text = text.replace(/<\/div>/gi, "\n")
  text = text.replace(/<div[^>]*>/gi, "")

  // Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n")

  // Convert links to text with URL
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")

  // Convert list items
  text = text.replace(/<li[^>]*>/gi, "\n• ")
  text = text.replace(/<\/li>/gi, "")
  text = text.replace(/<\/?[ou]l[^>]*>/gi, "\n")

  // Convert bold and italic
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "$1")
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, "$1")
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1")
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, "$1")

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "")

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/g, "€")

  // Clean up excessive whitespace
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n") // Max 2 consecutive newlines
  text = text.replace(/[ \t]+/g, " ") // Normalize spaces
  text = text.trim()

  return text
}
