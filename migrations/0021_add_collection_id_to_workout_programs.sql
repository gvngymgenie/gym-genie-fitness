-- Migration to add collection_id to workout_programs
-- Run this migration to add the relationship

ALTER TABLE "workout_programs" ADD COLUMN "collection_id" VARCHAR REFERENCES "workout_collections"("id");

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_workout_programs_collection_id" ON "workout_programs"("collection_id");