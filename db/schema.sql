-- Users table (admin + clients)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'client', -- 'admin' or 'client'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cards table (one per client user)
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL: /john-smith

  -- Basic Info (v1)
  name VARCHAR(255),
  title VARCHAR(255),
  company VARCHAR(255),
  company_highlight VARCHAR(100), -- e.g. ".ai" portion highlighted in color

  -- Contact (v1)
  email VARCHAR(255),
  phone_us VARCHAR(50),
  phone_intl VARCHAR(50),
  website VARCHAR(255),
  location VARCHAR(255),

  -- Social Links (v1)
  linkedin VARCHAR(255),
  instagram VARCHAR(255),
  twitter VARCHAR(255),
  facebook VARCHAR(255),
  github VARCHAR(255),
  youtube VARCHAR(255),
  tiktok VARCHAR(255),

  -- Branding footer (v1)
  brand_name VARCHAR(255),
  brand_tagline VARCHAR(255),

  -- v2 ready (hidden in UI for now)
  headshot_url VARCHAR(500),
  primary_color VARCHAR(20) DEFAULT '#00a8e1',
  secondary_color VARCHAR(20) DEFAULT '#1a3e5c',
  bg_color_start VARCHAR(20) DEFAULT '#1a3e5c',
  bg_color_end VARCHAR(20) DEFAULT '#0d2233',
  accent_bar_color VARCHAR(20) DEFAULT '#00a8e1',

  -- Status
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
