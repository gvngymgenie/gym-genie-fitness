-- Add notes column to diet_plans table
-- This column stores optional dietary notes, tips, or recommendations from AI generation

ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN diet_plans.notes IS 'Optional dietary notes, tips, or recommendations from AI generation';
