-- Run this once in your Supabase SQL Editor (Database > SQL Editor)
-- Adds food profile columns to the existing profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_preferences JSONB DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_ai_context  TEXT    DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_profile_set BOOLEAN DEFAULT FALSE;
