-- Switches on Antlertee's Meta Pixel (id supplied by the client, 2026-11-19), so it works without anyone pasting it in
-- the admin. A pixel id is public (it appears in every visitor's browser). Only fills it in when no Meta Pixel id has
-- been saved yet: an id already set in Settings → Connections is never overwritten. Safe to run more than once.
INSERT INTO site_settings (key, value, updated_at)
VALUES ('connections', '{"metaPixel": {"id": "1899322807510934", "enabled": true}}'::jsonb, now())
ON CONFLICT (key) DO UPDATE
  SET value = site_settings.value || '{"metaPixel": {"id": "1899322807510934", "enabled": true}}'::jsonb,
      updated_at = now()
  WHERE coalesce(site_settings.value -> 'metaPixel' ->> 'id', '') = '';
