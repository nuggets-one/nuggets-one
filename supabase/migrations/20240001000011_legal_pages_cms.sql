-- CMS fields for legal_pages + public RLS: anon/authenticated see enabled rows only.

ALTER TABLE legal_pages
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS body_markdown text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_footer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_account_menu boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_index boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE legal_pages SET page_title = label WHERE page_title IS NULL;

UPDATE legal_pages SET robots_index = false WHERE slug = 'contact';

COMMENT ON TABLE legal_pages IS
  'Legal documents for /legal/[slug]; public metadata + body_markdown; visibility flags.';

CREATE INDEX IF NOT EXISTS idx_legal_pages_footer_list
  ON legal_pages (is_enabled, show_in_footer, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_legal_pages_account_menu_list
  ON legal_pages (is_enabled, show_in_account_menu, sort_order ASC);

DROP POLICY IF EXISTS "legal_pages: public read" ON legal_pages;
DROP POLICY IF EXISTS "legal_pages: public read enabled only" ON legal_pages;

CREATE POLICY "legal_pages: public read enabled only"
  ON legal_pages FOR SELECT
  USING (is_enabled = true);

CREATE OR REPLACE FUNCTION set_legal_pages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_pages_set_updated_at ON legal_pages;
CREATE TRIGGER legal_pages_set_updated_at
  BEFORE UPDATE ON legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION set_legal_pages_updated_at();

INSERT INTO legal_pages (slug, label, sort_order, page_title, body_markdown, is_enabled, show_in_footer, show_in_account_menu, robots_index)
VALUES
  ('about', 'About Us', 10, 'About Us', '', true, true, true, true),
  ('disclaimer', 'Disclaimer', 40, 'Disclaimer', '', true, true, true, true),
  ('copyright-takedown-policy', 'Copyright & Takedown Policy', 50, 'Copyright & Takedown Policy', '', true, true, true, true),
  ('guidelines', 'Community Guidelines', 60, 'Community Guidelines', '', true, true, true, true),
  ('cookie-policy', 'Cookie Policy', 70, 'Cookie Policy', '', true, true, true, true)
ON CONFLICT (slug) DO NOTHING;

UPDATE legal_pages SET sort_order = 20 WHERE slug = 'terms';
UPDATE legal_pages SET sort_order = 30 WHERE slug = 'privacy';
UPDATE legal_pages SET sort_order = 80 WHERE slug = 'contact';
