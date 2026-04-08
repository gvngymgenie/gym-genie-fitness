-- Migration: Add training_type column to members table
-- This adds the training type field for members

ALTER TABLE members ADD COLUMN training_type TEXT;
