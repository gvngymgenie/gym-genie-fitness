-- Migration for Workout Collections table
-- Run this migration to create the new table

CREATE TABLE IF NOT EXISTS "workout_collections" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Seed default workout collections
INSERT INTO "workout_collections" ("name", "description", "is_active") VALUES
('Full Body Workout', 'Complete full body workout routine', true),
('Upper Body Strength', 'Focus on upper body muscle groups', true),
('Lower Body Power', 'Focus on lower body muscle groups', true),
('Cardio Blast', 'High intensity cardio exercises', true),
('Core Strengthening', 'Core and abs focused routine', true),
('HIIT Training', 'High intensity interval training', true),
('Flexibility & Mobility', 'Stretching and mobility exercises', true)
ON CONFLICT (name) DO NOTHING;
