/** Default when `site_settings.consumer_disclaimer` is missing or empty. */
export const DEFAULT_CONSUMER_DISCLAIMER =
  'Curated summaries and links are informational only—they are not financial, investment, legal, or tax advice.'

/** @deprecated Use `getConsumerDisclaimer()` in Server Components; kept for imports + DB fallback. */
export const LEGAL_CONSUMER_DISCLAIMER = DEFAULT_CONSUMER_DISCLAIMER
