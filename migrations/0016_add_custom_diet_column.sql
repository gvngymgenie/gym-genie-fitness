-- Add custom_diet column to diet_plans table
ALTER TABLE diet_plans ADD COLUMN custom_diet BOOLEAN NOT NULL DEFAULT false;
