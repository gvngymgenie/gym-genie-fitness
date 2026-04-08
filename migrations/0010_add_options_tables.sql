-- Migration for Interest Options and Health Options tables
-- Run this migration to create the new tables

CREATE TABLE IF NOT EXISTS "interest_options" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "health_options" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Seed default interest options
INSERT INTO "interest_options" ("name", "is_active") VALUES
('Weight Loss', true),
('Muscle Gain', true),
('Bodybuilding', true),
('Powerlifting', true),
('Crossfit', true),
('Cardio', true),
('Yoga', true),
('General Fitness', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default health options
INSERT INTO "health_options" ("name", "is_active") VALUES
('None', true),
('Asthma', true),
('Blood Pressure', true),
('Diabetes', true),
('Hypertension', true),
('Previous Injury', true),
('Other', true)
ON CONFLICT (name) DO NOTHING;
