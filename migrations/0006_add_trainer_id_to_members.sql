-- Migration: Add trainer_id to members table

ALTER TABLE members
ADD COLUMN trainer_id varchar REFERENCES users(id);