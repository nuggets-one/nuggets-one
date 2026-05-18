/** Avoid main-thread freeze from DOM parse + tree walk on huge HTML pastes. */
export const MAX_SYNC_HTML_CLIPBOARD_CHARS = 96_000

export function normalizeClipboardMarkdown(markdown: string): string {
  return markdown.replace(/\n{3,}/g, '\n\n').trim()
}

export function convertClipboardHtmlToMarkdown(html: string, plainTextFallback: string): string {
  if (html.length > MAX_SYNC_HTML_CLIPBOARD_CHARS) {
    return plainTextFallback
  }
  const markdown = convertHtmlToMarkdown(html)
  return markdown || plainTextFallback
}

export function convertHtmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return normalizeClipboardMarkdown(processNode(doc.body))
}

const TEXT_NODE = 3
const ELEMENT_NODE = 1

function processNode(node: Node): string {
  if (node.nodeType === TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== ELEMENT_NODE) {
    return ''
  }

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes)
    .map(processNode)
    .join('')

  switch (tag) {
    case 'strong':
    case 'b': {
      const trimmed = children.trim()
      return trimmed ? `**${trimmed}**` : ''
    }
    case 'em':
    case 'i': {
      const trimmed = children.trim()
      return trimmed ? `*${trimmed}*` : ''
    }
    case 'p': {
      const trimmed = children.trim()
      return trimmed ? `\n\n${trimmed}\n` : ''
    }
    case 'br':
      return '\n'
    case 'a': {
      const href = el.getAttribute('href')?.trim()
      const text = children.trim() || href || ''
      return href ? `[${text}](${href})` : text
    }
    case 'ul':
    case 'ol':
      return children ? `\n${children}\n` : ''
    case 'li': {
      const trimmed = children.trim()
      return trimmed ? `- ${trimmed}\n` : ''
    }
    case 'h1': {
      const trimmed = children.trim()
      return trimmed ? `\n# ${trimmed}\n\n` : ''
    }
    case 'h2': {
      const trimmed = children.trim()
      return trimmed ? `\n## ${trimmed}\n\n` : ''
    }
    case 'h3': {
      const trimmed = children.trim()
      return trimmed ? `\n### ${trimmed}\n\n` : ''
    }
    case 'blockquote': {
      const trimmed = children.trim()
      return trimmed ? `\n> ${trimmed}\n\n` : ''
    }
    case 'code':
      return children ? `\`${children}\`` : ''
    case 'pre': {
      const trimmed = children.trim()
      return trimmed ? `\n\`\`\`\n${trimmed}\n\`\`\`\n` : ''
    }
    case 'div':
      return children ? `\n${children}\n` : ''
    default:
      return children
  }
}
