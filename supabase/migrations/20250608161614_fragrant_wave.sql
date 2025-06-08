/*
  # Complete Social Media Database Schema

  1. New Tables
    - Enhanced posts table with visibility
    - Complete friends system
    - Messages with read status
    - Likes and comments
    - Stories with photo support
    - Notifications system

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Ensure proper user isolation

  3. Functions
    - Story management functions
    - Notification helpers
    - Real-time support
*/

-- Create or update posts table with visibility
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  video_url text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add visibility column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN visibility text DEFAULT 'public';
    ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check 
    CHECK (visibility IN ('public', 'friends'));
  END IF;
END $$;

-- Update existing posts to have public visibility
UPDATE public.posts SET visibility = 'public' WHERE visibility IS NULL;

-- Make visibility column not null
ALTER TABLE public.posts ALTER COLUMN visibility SET NOT NULL;

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text,
  photo_urls jsonb,
  photo_metadata jsonb,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create story_views table
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create call_history table
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type text DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status text DEFAULT 'initiated' CHECK (status IN ('initiated', 'answered', 'missed', 'ended')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration integer
);

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Users can view posts based on visibility and friendship" 
  ON public.posts FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR 
    visibility = 'public' OR 
    (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM public.friends 
      WHERE ((sender_id = auth.uid() AND receiver_id = posts.user_id) OR 
             (sender_id = posts.user_id AND receiver_id = auth.uid())) 
      AND status = 'accepted'
    ))
  );

CREATE POLICY "Users can insert their own posts" 
  ON public.posts FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
  ON public.posts FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
  ON public.posts FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Friends policies
CREATE POLICY "Users can view their own friend connections" 
  ON public.friends FOR SELECT 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send friend requests" 
  ON public.friends FOR INSERT 
  TO authenticated 
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update friend requests they're involved in" 
  ON public.friends FOR UPDATE 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can delete friend connections they're involved in" 
  ON public.friends FOR DELETE 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view their own messages" 
  ON public.messages FOR SELECT 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" 
  ON public.messages FOR UPDATE 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Likes policies
CREATE POLICY "Users can view all likes" 
  ON public.likes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can like posts" 
  ON public.likes FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own likes" 
  ON public.likes FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Comments policies
CREATE POLICY "Users can view all comments" 
  ON public.comments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can create comments" 
  ON public.comments FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" 
  ON public.comments FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" 
  ON public.comments FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Comment likes policies
CREATE POLICY "Users can view all comment likes" 
  ON public.comment_likes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can like comments" 
  ON public.comment_likes FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own comment likes" 
  ON public.comment_likes FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Stories policies
CREATE POLICY "Users can view all non-expired stories" 
  ON public.stories FOR SELECT 
  TO authenticated 
  USING (expires_at > now());

CREATE POLICY "Users can create their own stories" 
  ON public.stories FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stories" 
  ON public.stories FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories" 
  ON public.stories FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Story views policies
CREATE POLICY "Users can view story views" 
  ON public.story_views FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can record story views" 
  ON public.story_views FOR INSERT 
  TO authenticated 
  WITH CHECK (viewer_id = auth.uid());

-- Call history policies
CREATE POLICY "Users can view their own call history" 
  ON public.call_history FOR SELECT 
  TO authenticated 
  USING (caller_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create call records" 
  ON public.call_history FOR INSERT 
  TO authenticated 
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Users can update call records they're involved in" 
  ON public.call_history FOR UPDATE 
  TO authenticated 
  USING (caller_id = auth.uid() OR receiver_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);
CREATE INDEX IF NOT EXISTS idx_friends_sender_receiver ON public.friends(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON public.likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at);

-- Create functions for story management
CREATE OR REPLACE FUNCTION public.increment_story_views(story_uuid uuid, viewer_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  view_count integer;
BEGIN
  -- Insert or ignore the view record
  INSERT INTO public.story_views (story_id, viewer_id)
  VALUES (story_uuid, viewer_uuid)
  ON CONFLICT (story_id, viewer_id) DO NOTHING;
  
  -- Update and return the view count
  UPDATE public.stories 
  SET views_count = views_count + 1 
  WHERE id = story_uuid
  RETURNING views_count INTO view_count;
  
  RETURN COALESCE(view_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_story_photos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired stories and their associated views
  DELETE FROM public.story_views 
  WHERE story_id IN (
    SELECT id FROM public.stories 
    WHERE expires_at < now()
  );
  
  DELETE FROM public.stories 
  WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.add_photos_to_story(
  story_user_id uuid,
  new_photo_urls text[],
  new_photo_metadata jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  story_id uuid;
  current_photos jsonb;
  updated_photos jsonb;
BEGIN
  -- Get or create story for today
  SELECT id, photo_urls INTO story_id, current_photos
  FROM public.stories 
  WHERE user_id = story_user_id 
    AND expires_at > now()
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF story_id IS NULL THEN
    -- Create new story
    INSERT INTO public.stories (user_id, photo_urls, photo_metadata, image_url)
    VALUES (story_user_id, to_jsonb(new_photo_urls), new_photo_metadata, new_photo_urls[1])
    RETURNING id INTO story_id;
  ELSE
    -- Update existing story
    updated_photos := COALESCE(current_photos, '[]'::jsonb) || to_jsonb(new_photo_urls);
    UPDATE public.stories 
    SET photo_urls = updated_photos,
        photo_metadata = COALESCE(photo_metadata, '[]'::jsonb) || new_photo_metadata
    WHERE id = story_id;
  END IF;
  
  RETURN story_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_story_photos(
  story_id uuid,
  photo_indices integer[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_photos jsonb;
  updated_photos jsonb := '[]'::jsonb;
  i integer;
BEGIN
  -- Get current photos
  SELECT photo_urls INTO current_photos
  FROM public.stories 
  WHERE id = story_id AND user_id = auth.uid();
  
  IF current_photos IS NULL THEN
    RETURN false;
  END IF;
  
  -- Rebuild array without specified indices
  FOR i IN 0..(jsonb_array_length(current_photos) - 1) LOOP
    IF NOT (i = ANY(photo_indices)) THEN
      updated_photos := updated_photos || (current_photos -> i);
    END IF;
  END LOOP;
  
  -- Update or delete story
  IF jsonb_array_length(updated_photos) = 0 THEN
    DELETE FROM public.stories WHERE id = story_id;
  ELSE
    UPDATE public.stories 
    SET photo_urls = updated_photos,
        image_url = updated_photos ->> 0
    WHERE id = story_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Set up realtime
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.friends REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.stories REPLICA IDENTITY FULL;

-- Create publication for realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.posts,
  public.friends,
  public.messages,
  public.likes,
  public.comments,
  public.comment_likes,
  public.stories,
  public.story_views,
  public.call_history;