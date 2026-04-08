-- Fix interest_areas column type in members table to support arrays

-- Drop temp column if it exists
ALTER TABLE members DROP COLUMN IF EXISTS interest_areas_temp;

-- Add a temporary array column
ALTER TABLE members ADD COLUMN interest_areas_temp TEXT[];

-- Migrate existing data: convert single text to array
UPDATE members SET interest_areas_temp = ARRAY[interest_areas] WHERE interest_areas IS NOT NULL;

-- Drop the old column
ALTER TABLE members DROP COLUMN interest_areas;

-- Rename the temp column to the correct name
ALTER TABLE members RENAME COLUMN interest_areas_temp TO interest_areas;

-- Set correct type and default
ALTER TABLE members ALTER COLUMN interest_areas SET DATA TYPE TEXT[];
ALTER TABLE members ALTER COLUMN interest_areas SET DEFAULT ARRAY[]::TEXT[];

-- Optional: Add a comment for clarity
COMMENT ON COLUMN members.interest_areas IS 'Array of interest areas for the member';