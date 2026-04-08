-- AI Usage Tracking Tables for Gym Genie
-- These tables track AI usage for both members and admins

-- =====================================================
-- Table 1: admin_ai_usage (for admin/staff AI usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_ai_usage (
  id VARCHAR(50) PRIMARY KEY,
  admin_id VARCHAR(50) NOT NULL,
  admin_name VARCHAR(100),
  admin_email VARCHAR(255),
  feature_type VARCHAR(50) NOT NULL, -- 'workout_generation', 'diet_generation', 'analysis', 'reports'
  action_description TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER,
  response_tokens INTEGER,
  total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(prompt_tokens, 0) + COALESCE(response_tokens, 0)) STORED,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for admin usage queries
CREATE INDEX IF NOT EXISTS idx_admin_ai_usage_admin_id ON admin_ai_usage(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_ai_usage_created_at ON admin_ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_ai_usage_feature_type ON admin_ai_usage(feature_type);

-- =====================================================
-- Table 2: member_ai_usage_summary (aggregate view of member AI usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS member_ai_usage_summary (
  id VARCHAR(50) PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL,
  member_name VARCHAR(100),
  member_email VARCHAR(255),
  total_workout_generations INTEGER NOT NULL DEFAULT 0,
  total_diet_generations INTEGER NOT NULL DEFAULT 0,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  last_usage_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for member usage queries
CREATE INDEX IF NOT EXISTS idx_member_ai_usage_member_id ON member_ai_usage_summary(member_id);
CREATE INDEX IF NOT EXISTS idx_member_ai_usage_total_credits ON member_ai_usage_summary(total_credits_used DESC);

-- =====================================================
-- Table 3: daily_ai_usage (aggregates for reporting)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_ai_usage (
  id VARCHAR(50) PRIMARY KEY,
  usage_date DATE NOT NULL UNIQUE,
  member_workout_count INTEGER NOT NULL DEFAULT 0,
  member_diet_count INTEGER NOT NULL DEFAULT 0,
  member_credits_used INTEGER NOT NULL DEFAULT 0,
  admin_workout_count INTEGER NOT NULL DEFAULT 0,
  admin_diet_count INTEGER NOT NULL DEFAULT 0,
  admin_credits_used INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_ai_usage_date ON daily_ai_usage(usage_date DESC);

-- =====================================================
-- Table 4: member_credits (AI credit balance tracking for members)
-- =====================================================
CREATE TABLE IF NOT EXISTS member_credits (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) NOT NULL,
  balance INTEGER NOT NULL DEFAULT 5,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_member_credits_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Index for member credits queries
CREATE INDEX IF NOT EXISTS idx_member_credits_member_id ON member_credits(member_id);
CREATE INDEX IF NOT EXISTS idx_member_credits_balance ON member_credits(balance);

-- =====================================================
-- Table 5: credit_packages (predefined credit packages for purchase)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for credit packages queries
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_packages_sort ON credit_packages(sort_order);

-- =====================================================
-- Table 6: credit_transactions (log of all credit balance changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_credit_transactions_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Index for credit transactions queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_member_id ON credit_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);