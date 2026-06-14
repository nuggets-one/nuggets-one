const EXTERNAL_HREF_RE = /^(https?:|mailto:)/i

/** Post-process sanitized card preview HTML so external links open in a new tab. */
export function stampNewTabOnExternalAnchors(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (full, attrs: string) => {
    if (/\btarget=/i.test(attrs)) return full

    const hrefMatch = attrs.match(/\bhref=(?:"([^"]*)"|'([^']*)')/i)
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? ''
    if (!EXTERNAL_HREF_RE.test(href)) return full

    const rel = /\brel=/i.test(attrs) ? '' : ' rel="noopener noreferrer"'
    return `<a${attrs} target="_blank"${rel}>`
  })
}
