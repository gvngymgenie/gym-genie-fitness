-- Safe migration to fix interest_areas column type in leads and members tables
-- This migration uses USING clause for safe type conversion and is idempotent

-- ============================================
-- FIX FOR LEADS TABLE
-- ============================================

-- Check current column type and state
DO $$
DECLARE
    col_exists BOOLEAN;
    col_type TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'interest_areas'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Get current data type
        SELECT data_type INTO col_type
        FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'interest_areas';
        
        RAISE NOTICE 'Leads interest_areas current type: %', col_type;
        
        -- If not already an array, convert it
        IF col_type != 'ARRAY' THEN
            ALTER TABLE leads ALTER COLUMN interest_areas TYPE TEXT[] USING interest_areas::TEXT[];
            RAISE NOTICE 'Converted leads.interest_areas to TEXT[]';
        ELSE
            RAISE NOTICE 'Leads interest_areas is already TEXT[], no change needed';
        END IF;
        
        -- Ensure default value
        ALTER TABLE leads ALTER COLUMN interest_areas SET DEFAULT ARRAY[]::TEXT[];
    ELSE
        -- Column doesn't exist, create it with correct type
        ALTER TABLE leads ADD COLUMN interest_areas TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Created leads.interest_areas as TEXT[]';
    END IF;
END $$;

-- ============================================
-- FIX FOR MEMBERS TABLE
-- ============================================

DO $$
DECLARE
    col_exists BOOLEAN;
    col_type TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'interest_areas'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Get current data type
        SELECT data_type INTO col_type
        FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'interest_areas';
        
        RAISE NOTICE 'Members interest_areas current type: %', col_type;
        
        -- If not already an array, convert it
        IF col_type != 'ARRAY' THEN
            ALTER TABLE members ALTER COLUMN interest_areas TYPE TEXT[] USING interest_areas::TEXT[];
            RAISE NOTICE 'Converted members.interest_areas to TEXT[]';
        ELSE
            RAISE NOTICE 'Members interest_areas is already TEXT[], no change needed';
        END IF;
        
        -- Ensure default value
        ALTER TABLE members ALTER COLUMN interest_areas SET DEFAULT ARRAY[]::TEXT[];
    ELSE
        -- Column doesn't exist, create it with correct type
        ALTER TABLE members ADD COLUMN interest_areas TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Created members.interest_areas as TEXT[]';
    END IF;
END $$;

-- ============================================
-- ALSO FIX trainer_profiles TABLE IF NEEDED
-- ============================================

DO $$
DECLARE
    col_exists BOOLEAN;
    col_type TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_profiles' AND column_name = 'interest_areas'
    ) INTO col_exists;
    
    IF col_exists THEN
        SELECT data_type INTO col_type
        FROM information_schema.columns 
        WHERE table_name = 'trainer_profiles' AND column_name = 'interest_areas';
        
        RAISE NOTICE 'Trainer profiles interest_areas current type: %', col_type;
        
        IF col_type != 'ARRAY' THEN
            ALTER TABLE trainer_profiles ALTER COLUMN interest_areas TYPE TEXT[] USING interest_areas::TEXT[];
            RAISE NOTICE 'Converted trainer_profiles.interest_areas to TEXT[]';
        ELSE
            RAISE NOTICE 'Trainer profiles interest_areas is already TEXT[], no change needed';
        END IF;
        
        ALTER TABLE trainer_profiles ALTER COLUMN interest_areas SET DEFAULT ARRAY[]::TEXT[];
    ELSE
        ALTER TABLE trainer_profiles ADD COLUMN interest_areas TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Created trainer_profiles.interest_areas as TEXT[]';
    END IF;
END $$;

-- Verify the fix
DO $$
DECLARE
    leads_type TEXT;
    members_type TEXT;
    trainer_type TEXT;
BEGIN
    SELECT data_type INTO leads_type
    FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'interest_areas';
    
    SELECT data_type INTO members_type
    FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'interest_areas';
    
    SELECT data_type INTO trainer_type
    FROM information_schema.columns 
    WHERE table_name = 'trainer_profiles' AND column_name = 'interest_areas';
    
    RAISE NOTICE 'Final column types:';
    RAISE NOTICE '  leads.interest_areas: %', COALESCE(leads_type, 'NOT FOUND');
    RAISE NOTICE '  members.interest_areas: %', COALESCE(members_type, 'NOT FOUND');
    RAISE NOTICE '  trainer_profiles.interest_areas: %', COALESCE(trainer_type, 'NOT FOUND');
END $$;
