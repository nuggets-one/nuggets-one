-- Phase 5: footer-driven legal surfaces — PRODUCT §3.3 · remediation plan Phase 5.
-- Rows drive labels + order; URLs are always `/legal/[slug]` in the application.

CREATE TABLE IF NOT EXISTS legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT legal_pages_slug_check CHECK (
    slug ~ '^[a-z0-9-]+$'
    AND slug NOT LIKE '-%'
    AND slug NOT LIKE '%-'
  )
);

COMMENT ON TABLE legal_pages IS
  'Public metadata for footer legal links (routes under app/(main)/legal/[slug]/).';

CREATE INDEX IF NOT EXISTS idx_legal_pages_sort ON legal_pages (sort_order ASC);

ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_pages: public read"
  ON legal_pages FOR SELECT
  USING (true);

GRANT SELECT ON legal_pages TO anon, authenticated;

INSERT INTO legal_pages (slug, label, sort_order) VALUES
  ('terms', 'Terms of use', 10),
  ('privacy', 'Privacy policy', 20),
  ('contact', 'Contact', 30)
ON CONFLICT (slug) DO NOTHING;
