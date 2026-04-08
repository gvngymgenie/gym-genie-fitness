-- Migration: Add member_measurements table
-- This creates a table for tracking member body measurements over time

CREATE TABLE member_measurements (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(255) NOT NULL,
  date TEXT NOT NULL,
  chest REAL NOT NULL,
  waist REAL NOT NULL,
  arms REAL NOT NULL,
  thighs REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster member lookups
CREATE INDEX idx_member_measurements_member_id ON member_measurements(member_id);
CREATE INDEX idx_member_measurements_date ON member_measurements(date);
