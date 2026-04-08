-- Migration: Add discount fields to payments table
-- Safely adds original_amount and discount_percentage columns
-- Backfills existing records with amount values and 0% discount

-- Step 1: Add columns as nullable
ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;

-- Step 2: Backfill existing records (these are from before the new schema)
UPDATE payments SET original_amount = amount WHERE original_amount IS NULL;
UPDATE payments SET discount_percentage = 0 WHERE discount_percentage IS NULL;

-- Step 3: Set default values
ALTER TABLE payments ALTER COLUMN original_amount SET DEFAULT 0;
ALTER TABLE payments ALTER COLUMN discount_percentage SET DEFAULT 0;

-- Step 4: Make columns NOT NULL
ALTER TABLE payments ALTER COLUMN original_amount SET NOT NULL;
ALTER TABLE payments ALTER COLUMN discount_percentage SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN payments.original_amount IS 'Original price before any discount';
COMMENT ON COLUMN payments.discount_percentage IS 'Discount percentage applied (0-100)';
