-- Add custom_workout_plan column to workout_programs table
ALTER TABLE workout_programs ADD COLUMN custom_workout_plan boolean NOT NULL DEFAULT false;
