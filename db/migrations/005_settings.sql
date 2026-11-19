-- Site settings edited in the admin (Settings page), one row per group, e.g. key 'connections' holds the tracking and
-- verification ids (Meta Pixel, GA4, Tag Manager, TikTok, Clarity, Search Console, Bing).
-- Idempotent: safe to run more than once.
CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
