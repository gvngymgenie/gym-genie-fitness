-- Fix interest_areas column type in leads table
-- This migration handles the case where interest_areas exists but is not an array type

-- First, check if interest_areas column exists and what type it is
-- If it's a single text field, we need to convert it to array

-- For PostgreSQL: Handle the conversion properly
-- Drop the existing column if it's not an array type and recreate it
ALTER TABLE leads DROP COLUMN IF EXISTS interest_areas_temp;

-- Create a temporary column to store the data
ALTER TABLE leads ADD COLUMN interest_areas_temp TEXT[];

-- Migrate existing data if the old column exists
DO $$
BEGIN
    -- Check if the old interest_areas column exists and is not an array
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'interest_areas'
        AND data_type != 'ARRAY'
    ) THEN
        -- Convert single text values to arrays
        UPDATE leads SET interest_areas_temp = ARRAY[interest_areas] 
        WHERE interest_areas IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE leads DROP COLUMN interest_areas;
    END IF;
END $$;

-- Rename the temporary column to the correct name
ALTER TABLE leads RENAME COLUMN interest_areas_temp TO interest_areas;

-- Ensure the column has the correct type and default
ALTER TABLE leads ALTER COLUMN interest_areas SET DATA TYPE TEXT[];
ALTER TABLE leads ALTER COLUMN interest_areas SET DEFAULT ARRAY[]::TEXT[];

-- For SQLite: This is handled in the existing migration 0003_add_interest_areas.sql
