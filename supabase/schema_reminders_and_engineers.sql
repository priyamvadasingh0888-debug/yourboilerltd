-- ====================================================================
-- MIGRATION: Service Reminders, CP12 Enhancements, Engineer Vault, Time Slots
-- Date: November 2026
-- Author: Your Boiler Ltd Engineering
-- ====================================================================

-- 1. Customer Type: Add 'house_association' if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'customer_type' AND e.enumlabel = 'house_association'
  ) THEN
    ALTER TYPE customer_type ADD VALUE 'house_association';
  END IF;
END $$;

-- 2. Engineer Categories & Qualifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engineer_category') THEN
    CREATE TYPE engineer_category AS ENUM ('in_house', 'subcontractor');
  END IF;
END $$;

ALTER TABLE engineers 
  ADD COLUMN IF NOT EXISTS category engineer_category DEFAULT 'in_house',
  ADD COLUMN IF NOT EXISTS qualifications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license_number TEXT;

-- 3. Engineer Document Vault (Any format: PDF, images, etc.)
CREATE TABLE IF NOT EXISTS engineer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'image/jpeg', 'image/png', etc.
  file_size_bytes BIGINT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engineer_docs_engineer_id ON engineer_documents(engineer_id);

-- 4. Job Time Slot Allocation (Morning, Afternoon, Evening, Custom)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_time_slot') THEN
    CREATE TYPE schedule_time_slot AS ENUM ('morning', 'afternoon', 'evening', 'custom');
  END IF;
END $$;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS time_slot schedule_time_slot DEFAULT 'custom';

-- 5. Extended CP12 Appliances Table (High/Low Combustion, Pressure, Flue)
ALTER TABLE certificate_appliances
  ADD COLUMN IF NOT EXISTS operating_pressure TEXT,
  ADD COLUMN IF NOT EXISTS high_combustion_co_ppm INT,
  ADD COLUMN IF NOT EXISTS high_combustion_co2_pct NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS high_combustion_ratio NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS low_combustion_co_ppm INT,
  ADD COLUMN IF NOT EXISTS low_combustion_co2_pct NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS low_combustion_ratio NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS spillage_test TEXT,
  ADD COLUMN IF NOT EXISTS visual_flue_condition TEXT,
  ADD COLUMN IF NOT EXISTS termination_satisfactory BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS flue_performance_check TEXT;

-- 6. CP12 Smoke & Carbon Monoxide (CO) Alarm Details Grid
CREATE TABLE IF NOT EXISTS certificate_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  alarm_type TEXT NOT NULL DEFAULT 'CO', -- 'CO' or 'Smoke'
  approved_fitted BOOLEAN DEFAULT TRUE,
  expiry_date DATE,
  test_satisfactory BOOLEAN DEFAULT TRUE,
  power_source TEXT DEFAULT 'Battery', -- 'Battery' or 'Hardwired'
  replacement_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_alarms_cert_id ON certificate_alarms(certificate_id);

-- 7. Inspection Service Reminders Table & Cycles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_service_type') THEN
    CREATE TYPE inspection_service_type AS ENUM (
      'boiler_service_cp12',    -- 12 Months
      'gas_inspection',         -- 12 Months
      'fire_alarm',             -- 6 Months
      'electrical_inspection'   -- 36 or 60 Months (3 or 5 Years)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS service_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_type inspection_service_type NOT NULL,
  interval_months INT NOT NULL, -- 6, 12, 36, 60
  last_service_date DATE,
  expiry_date DATE NOT NULL,
  next_reminder_date DATE NOT NULL,
  preferred_time_slot schedule_time_slot DEFAULT 'morning',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'booked', 'expired'
  reminders_sent_count INT NOT NULL DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  last_email_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_expiry ON service_reminders(expiry_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON service_reminders(status);
