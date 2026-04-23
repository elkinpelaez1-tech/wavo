-- ============================================================
-- WAVO — Schema de base de datos para Supabase / PostgreSQL
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- USERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  name           TEXT,
  business_name  TEXT,
  plan           TEXT DEFAULT 'free',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- CONTACTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT,
  phone         TEXT NOT NULL,
  opted_out     BOOLEAN DEFAULT false,
  opted_out_at  TIMESTAMPTZ,
  tags          TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (phone, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone   ON contacts(phone);

-- ──────────────────────────────────────────────────────────────
-- CAMPAIGNS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  template_name       TEXT,
  template_language   TEXT DEFAULT 'es',
  image_url           TEXT,
  status              TEXT DEFAULT 'draft',
  scheduled_at        TIMESTAMPTZ,
  total_recipients    INT DEFAULT 0,
  sent_count          INT DEFAULT 0,
  delivered_count     INT DEFAULT 0,
  read_count          INT DEFAULT 0,
  failed_count        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id     ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status      ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled   ON campaigns(scheduled_at);

-- ──────────────────────────────────────────────────────────────
-- MESSAGE LOGS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES contacts(id),
  meta_message_id  TEXT,
  status           TEXT DEFAULT 'queued',
  delivered_at     TIMESTAMPTZ,
  read_at          TIMESTAMPTZ,
  error_code       INT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_campaign    ON message_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_logs_contact     ON message_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_logs_meta_id     ON message_logs(meta_message_id);

-- ──────────────────────────────────────────────────────────────
-- TEMPLATES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  meta_template_name  TEXT NOT NULL,
  display_name        TEXT,
  category            TEXT,
  language            TEXT DEFAULT 'es',
  body_text           TEXT,
  has_image           BOOLEAN DEFAULT false,
  status              TEXT DEFAULT 'pending',
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (meta_template_name, user_id)
);

-- ──────────────────────────────────────────────────────────────
-- RLS — Row Level Security
-- Cada usuario solo ve sus propios datos
-- ──────────────────────────────────────────────────────────────
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates  ENABLE ROW LEVEL SECURITY;

-- Nota: el backend usa service_role_key que bypasea RLS
-- RLS protege acceso directo al cliente JS desde el frontend

-- ──────────────────────────────────────────────────────────────
-- FUNCIÓN: actualizar updated_at automáticamente
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON message_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
