const TOKEN_OVERRIDES: Record<string, string> = {
  ai: 'AI',
  pe: 'PE',
  vc: 'VC',
  fx: 'FX',
  ipo: 'IPO',
  etf: 'ETF',
  gdp: 'GDP',
  cpi: 'CPI',
  api: 'API',
  us: 'US',
  uk: 'UK',
  eu: 'EU',
}

function titleCaseWord(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function formatTagDisplayLabel(labelOrSlug: string): string {
  const raw = labelOrSlug.trim()
  if (!raw) return raw

  const tokens = raw
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  return tokens
    .map((token) => TOKEN_OVERRIDES[token.toLowerCase()] ?? titleCaseWord(token))
    .join(' ')
}
