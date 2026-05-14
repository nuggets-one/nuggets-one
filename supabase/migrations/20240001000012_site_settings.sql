-- Site-wide key/value copy (consumer disclaimer, etc.). Public read; writes via service role only.

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_settings IS
  'Global site copy and flags; anon/authenticated may SELECT; admin updates via service role.';

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings: public read" ON site_settings;
CREATE POLICY "site_settings: public read"
  ON site_settings FOR SELECT
  USING (true);

GRANT SELECT ON site_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION set_site_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_settings_set_updated_at ON site_settings;
CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_site_settings_updated_at();

INSERT INTO site_settings (setting_key, setting_value)
VALUES (
  'consumer_disclaimer',
  'Curated summaries and links are informational only—they are not financial, investment, legal, or tax advice.'
)
ON CONFLICT (setting_key) DO NOTHING;
