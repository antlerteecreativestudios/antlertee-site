-- Shopify-style admin: products and blog posts live in this database (replacing the Sanity studio), and leads move
-- through a sales pipeline with a timeline of notes and stage changes.
-- Idempotent: safe to run more than once.

-- Note: an earlier, never-deployed draft (003_cms.sql, removed) left empty cms_* tables on some development
-- databases. Nothing reads them; they are left alone here.

CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  category        text NOT NULL,
  sub             text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  -- Photo slot ids: a built-in image id, or "p-..." for photos uploaded in the admin (rows in media_overrides).
  image           text NOT NULL,
  gallery         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ "image": "<slot id>", "alt": "..." }]
  fabric          text NOT NULL DEFAULT '',
  gsm             integer,
  fit             text NOT NULL DEFAULT '',
  fit_note        text NOT NULL DEFAULT '',
  sizes           jsonb NOT NULL DEFAULT '[]'::jsonb,
  colours         jsonb NOT NULL DEFAULT '[]'::jsonb,
  finishes        jsonb NOT NULL DEFAULT '[]'::jsonb,
  drop_name       text NOT NULL DEFAULT '',
  lead_time       text NOT NULL DEFAULT '',
  specs           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- extra rows: [{ "label": "...", "value": "..." }]
  moq             text NOT NULL DEFAULT '',
  featured        boolean NOT NULL DEFAULT false,
  position        integer NOT NULL DEFAULT 0,
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_order_idx ON products (position, name);

CREATE TABLE IF NOT EXISTS posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  summary         text NOT NULL DEFAULT '',
  date            date NOT NULL DEFAULT current_date,
  tag             text NOT NULL DEFAULT '',
  image           text NOT NULL,
  body            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- blocks: { "type": "p" | "h2" | "note", "text" } or { "type": "ul", "items": [] }
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_date_idx ON posts (date DESC);

-- Sales pipeline. `status` stays the inbox state (new = unread, read, done = archived, spam).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_stage_check
  CHECK (stage IN ('new', 'contacted', 'quoted', 'sampling', 'production', 'delivered', 'lost'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads (stage);

-- Timeline on each lead: notes written by the admin and automatic stage-change entries.
CREATE TABLE IF NOT EXISTS lead_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind       text NOT NULL CHECK (kind IN ('note', 'stage')),
  body       text NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_events_lead_idx ON lead_events (lead_id, created_at);
