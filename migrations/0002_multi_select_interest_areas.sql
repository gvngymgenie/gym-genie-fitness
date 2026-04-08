-- Migration: Convert interestArea fields to interestAreas arrays

-- Add new array columns
ALTER TABLE leads ADD COLUMN interest_areas TEXT[];
ALTER TABLE members ADD COLUMN interest_areas TEXT[];

-- Migrate existing single values to arrays
UPDATE leads SET interest_areas = ARRAY[interest_area] WHERE interest_area IS NOT NULL;
UPDATE members SET interest_areas = ARRAY[interest_area] WHERE interest_area IS NOT NULL;

-- Drop old single columns
ALTER TABLE leads DROP COLUMN interest_area;
ALTER TABLE members DROP COLUMN interest_area;

-- Add comments for documentation
COMMENT ON COLUMN leads.interest_areas IS 'Array of interest areas for the lead';
COMMENT ON COLUMN members.interest_areas IS 'Array of interest areas for the member';