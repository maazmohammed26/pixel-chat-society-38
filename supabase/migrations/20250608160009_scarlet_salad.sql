/*
  # Add post visibility feature

  1. Changes
    - Add visibility column to posts table with default 'public'
    - Add check constraint to ensure visibility is either 'public' or 'friends'
    - Update existing posts to have 'public' visibility

  2. Security
    - No changes to RLS policies needed as filtering will be done in application layer
*/

-- Add visibility column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE posts ADD COLUMN visibility text DEFAULT 'public';
  END IF;
END $$;

-- Add check constraint for visibility values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'posts_visibility_check'
  ) THEN
    ALTER TABLE posts ADD CONSTRAINT posts_visibility_check 
    CHECK (visibility IN ('public', 'friends'));
  END IF;
END $$;

-- Update existing posts to have public visibility
UPDATE posts SET visibility = 'public' WHERE visibility IS NULL;

-- Make visibility column not null
ALTER TABLE posts ALTER COLUMN visibility SET NOT NULL;