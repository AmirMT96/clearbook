-- Clearbook Database Schema
-- Apply in Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  vorname TEXT,
  nachname TEXT,
  anrede TEXT CHECK (anrede IN ('Herr', 'Frau', 'Divers')),
  profil_type TEXT CHECK (profil_type IN ('ANGESTELLT', 'EINZELUNTERNEHMEN', 'BEIDES', 'GMBH')),
  land TEXT CHECK (land IN ('DE', 'AT', 'CH')) DEFAULT 'DE',
  ust_pflichtig BOOLEAN DEFAULT true,
  bottt_seed TEXT,
  bottt_name TEXT,
  language TEXT DEFAULT 'de',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('PRIVAT', 'EU')),
  emoji TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('PRIVAT', 'EU_VST', 'EU_NOVAT', 'INCOME_MAA', 'INCOME_EU', 'REFUND_MAA')),
  category_id UUID REFERENCES categories(id),
  vat_rate INTEGER DEFAULT 19 CHECK (vat_rate IN (0, 7, 19)),
  vat_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status TEXT DEFAULT 'ungefasst' CHECK (status IN ('ungefasst', 'vorgeschlagen', 'gebucht')),
  is_auto_booked BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  trip_id UUID,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learned_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  default_type TEXT,
  default_category_id UUID REFERENCES categories(id),
  default_vat_rate INTEGER DEFAULT 19,
  times_used INTEGER DEFAULT 1,
  auto_book BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_name)
);

CREATE TABLE IF NOT EXISTS recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  type TEXT,
  category_id UUID REFERENCES categories(id),
  vat_rate INTEGER DEFAULT 19,
  day_of_month INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  art TEXT CHECK (art IN ('PRIVAT', 'GESCHAEFT', 'GEMISCHT')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds_maa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id),
  status TEXT DEFAULT 'OFFEN' CHECK (status IN ('OFFEN', 'ERHALTEN')),
  submitted_date DATE,
  received_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ustva_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER,
  year INTEGER,
  status TEXT DEFAULT 'OFFEN' CHECK (status IN ('OFFEN', 'EXPORTIERT')),
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION insert_default_categories(p_user_id UUID, p_profil_type TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, emoji, is_default) VALUES
    (p_user_id, 'Wohnung', 'PRIVAT', '🏠', true),
    (p_user_id, 'Haushalt', 'PRIVAT', '🛒', true),
    (p_user_id, 'Essen', 'PRIVAT', '🍽️', true),
    (p_user_id, 'Freizeit', 'PRIVAT', '🎉', true),
    (p_user_id, 'Auto', 'PRIVAT', '🚗', true),
    (p_user_id, 'Privat', 'PRIVAT', '👤', true),
    (p_user_id, 'Sonstiges', 'PRIVAT', '📦', true);

  IF p_profil_type IN ('EINZELUNTERNEHMEN', 'BEIDES') THEN
    INSERT INTO categories (user_id, name, type, emoji, is_default) VALUES
      (p_user_id, 'Tools & Software', 'EU', '💻', true),
      (p_user_id, 'Fahrtkosten', 'EU', '🚗', true),
      (p_user_id, 'Bewirtung', 'EU', '🍽️', true),
      (p_user_id, 'Marketing', 'EU', '📣', true),
      (p_user_id, 'Büro', 'EU', '🏢', true),
      (p_user_id, 'Weiterbildung', 'EU', '📚', true),
      (p_user_id, 'Sonstiges EU', 'EU', '📦', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION learn_merchant_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  merchant TEXT;
BEGIN
  merchant := split_part(COALESCE(NEW.description, ''), ' ', 1);
  IF merchant = '' THEN RETURN NEW; END IF;

  INSERT INTO learned_merchants (user_id, merchant_name, default_type, default_category_id, default_vat_rate)
  VALUES (NEW.user_id, merchant, NEW.type, NEW.category_id, NEW.vat_rate)
  ON CONFLICT (user_id, merchant_name)
  DO UPDATE SET
    times_used = learned_merchants.times_used + 1,
    default_type = EXCLUDED.default_type,
    default_category_id = EXCLUDED.default_category_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS after_transaction_booked ON transactions;
CREATE TRIGGER after_transaction_booked
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'gebucht')
  EXECUTE FUNCTION learn_merchant_from_transaction();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds_maa ENABLE ROW LEVEL SECURITY;
ALTER TABLE ustva_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own data" ON profiles;
DROP POLICY IF EXISTS "Users own transactions" ON transactions;
DROP POLICY IF EXISTS "Users own categories" ON categories;
DROP POLICY IF EXISTS "Users own merchants" ON learned_merchants;
DROP POLICY IF EXISTS "Users own recurring" ON recurring_templates;
DROP POLICY IF EXISTS "Users own trips" ON trips;
DROP POLICY IF EXISTS "Users own refunds" ON refunds_maa;
DROP POLICY IF EXISTS "Users own exports" ON ustva_exports;

CREATE POLICY "Users own data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own merchants" ON learned_merchants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own recurring" ON recurring_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own trips" ON trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own refunds" ON refunds_maa FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own exports" ON ustva_exports FOR ALL USING (auth.uid() = user_id);
