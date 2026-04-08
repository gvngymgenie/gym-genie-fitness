-- Migration for workout_collection_members junction table
-- This enables many-to-many relationship between workouts and collections

CREATE TABLE IF NOT EXISTS "workout_collection_members" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "workout_id" VARCHAR NOT NULL REFERENCES "workout_programs"("id") ON DELETE CASCADE,
  "collection_id" VARCHAR NOT NULL REFERENCES "workout_collections"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE("workout_id", "collection_id")
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_wcm_workout_id" ON "workout_collection_members"("workout_id");
CREATE INDEX IF NOT EXISTS "idx_wcm_collection_id" ON "workout_collection_members"("collection_id");

-- Migrate existing collection_id data to the new junction table
INSERT INTO "workout_collection_members" ("workout_id", "collection_id")
SELECT id, collection_id
FROM "workout_programs"
WHERE collection_id IS NOT NULL
ON CONFLICT (workout_id, collection_id) DO NOTHING;

-- Note: We keep the old collection_id column in workout_programs as backup
-- The junction table is now the source of truth for workout-collection relationships