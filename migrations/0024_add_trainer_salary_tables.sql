-- Trainer Salary Configuration Table
-- Stores per-trainer salary rules: base pay, per-session rate, attendance/review bonuses

CREATE TABLE IF NOT EXISTS trainer_salary_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id VARCHAR NOT NULL UNIQUE,
  base_salary INTEGER NOT NULL DEFAULT 0,
  per_session_rate INTEGER NOT NULL DEFAULT 0,
  attendance_bonus_per_day INTEGER NOT NULL DEFAULT 0,
  attendance_bonus_threshold INTEGER NOT NULL DEFAULT 20,
  review_bonus_min_rating INTEGER NOT NULL DEFAULT 4,
  review_bonus_amount INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trainer Payouts Table
-- Monthly payout records with calculated breakdown

CREATE TABLE IF NOT EXISTS trainer_payouts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id VARCHAR NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  base_salary INTEGER NOT NULL DEFAULT 0,
  attendance_days INTEGER NOT NULL DEFAULT 0,
  attendance_bonus INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  session_bonus INTEGER NOT NULL DEFAULT 0,
  review_avg_rating INTEGER NOT NULL DEFAULT 0,
  review_bonus INTEGER NOT NULL DEFAULT 0,
  gross_pay INTEGER NOT NULL DEFAULT 0,
  deductions INTEGER NOT NULL DEFAULT 0,
  net_pay INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  pay_date TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(trainer_id, month, year)
);

-- Trainer Payout Line Items Table
-- Detailed breakdown of each payout component

CREATE TABLE IF NOT EXISTS trainer_payout_line_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id VARCHAR NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries

-- Salary config lookup by trainer
CREATE INDEX IF NOT EXISTS idx_salary_config_trainer ON trainer_salary_configs(trainer_id);

-- Payout queries by trainer and period
CREATE INDEX IF NOT EXISTS idx_payouts_trainer ON trainer_payouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON trainer_payouts(year, month);
CREATE INDEX IF NOT EXISTS idx_payouts_trainer_period ON trainer_payouts(trainer_id, year, month);

-- Line item queries by payout
CREATE INDEX IF NOT EXISTS idx_line_items_payout ON trainer_payout_line_items(payout_id);
