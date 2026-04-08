-- Migration: Add training_types table
-- This creates a table for managing training types that members can select

CREATE TABLE training_types (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert default training types
INSERT INTO training_types (name) VALUES
  ('Personal Training'),
  ('Group Training'),
  ('Online Training'),
  ('Hybrid Training')
ON CONFLICT (name) DO NOTHING;
