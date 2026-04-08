-- Add updated_at column to diet_plans table
-- This column tracks when a diet plan was last modified

ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN diet_plans.updated_at IS 'Timestamp when the diet plan was last updated';
