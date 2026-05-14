export type LegalPageAdminRow = {
  id: string
  slug: string
  label: string
  page_title: string | null
  body_markdown: string
  sort_order: number
  is_enabled: boolean
  show_in_footer: boolean
  show_in_account_menu: boolean
  robots_index: boolean
  updated_at: string
}
