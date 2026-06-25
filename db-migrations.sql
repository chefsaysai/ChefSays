-- Run this once in your Supabase SQL Editor (Database > SQL Editor)
-- Adds food profile columns to the existing profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_preferences JSONB DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_ai_context  TEXT    DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_profile_set BOOLEAN DEFAULT FALSE;

-- Allows saving recipe JSON when a user logs a cooked meal
ALTER TABLE savings ADD COLUMN IF NOT EXISTS recipe_json TEXT DEFAULT NULL;

-- Allows saving pinned recipes directly onto a conversation record
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS saved_recipes JSONB DEFAULT '[]';

-- Recipe scheduling and reminders
CREATE TABLE IF NOT EXISTS scheduled_recipes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name        TEXT        NOT NULL,
  recipe_json      TEXT        DEFAULT NULL,
  scheduled_for    TIMESTAMPTZ NOT NULL,
  occasion         TEXT        DEFAULT NULL,
  reminder_minutes INT         DEFAULT 60,
  notified         BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scheduled_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own schedules" ON scheduled_recipes FOR ALL USING (auth.uid() = user_id);
