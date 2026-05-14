// Auto-generated types will replace this file.
// Run: npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
// 
// Manual placeholder until CLI generation is wired:

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      articles: { Row: Record<string, unknown> }
      tags: { Row: Record<string, unknown> }
      bookmarks: { Row: Record<string, unknown> }
      profiles: { Row: Record<string, unknown> }
      notification_preferences: { Row: Record<string, unknown> }
      user_notifications: { Row: Record<string, unknown> }
      community_collections: { Row: Record<string, unknown> }
      community_collection_entries: { Row: Record<string, unknown> }
      article_media: { Row: Record<string, unknown> }
      article_tags: { Row: Record<string, unknown> }
      legal_pages: {
        Row: {
          id: string
          slug: string
          label: string
          sort_order: number
          page_title: string | null
          body_markdown: string
          is_enabled: boolean
          show_in_footer: boolean
          show_in_account_menu: boolean
          robots_index: boolean
          updated_at: string
        }
      }
      site_settings: {
        Row: {
          setting_key: string
          setting_value: string
          updated_at: string
        }
      }
    }
  }
}
