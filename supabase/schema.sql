-- ==============================================================================
-- TomeStack: Database Schema for PostgreSQL / Supabase
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/.../sql/new
-- ==============================================================================

-- 1. Profiles Table (Extends Supabase Auth or standalone users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'Kolekcjoner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Books Table (Stores user owned book shelf and edition binding)
CREATE TABLE IF NOT EXISTS public.user_books (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- UUID or custom user identifier
  book_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  format_type TEXT DEFAULT 'hardcover',
  reading_status TEXT DEFAULT 'unread',
  is_hidden BOOLEAN DEFAULT FALSE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_book_unique UNIQUE (user_id, book_id)
);

ALTER TABLE public.user_books ADD COLUMN IF NOT EXISTS reading_status TEXT DEFAULT 'unread';
ALTER TABLE public.user_books ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 3. Custom User Books (User-added books from camera scanner or manual entry)
CREATE TABLE IF NOT EXISTS public.custom_books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  series_name TEXT,
  volume INT DEFAULT 1,
  format_type TEXT NOT NULL,
  isbn TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_books ENABLE ROW LEVEL SECURITY;

-- 5. Policies: rerunnable for existing installations as well as fresh databases.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own shelf books" ON public.user_books;
DROP POLICY IF EXISTS "Users can manage custom books" ON public.custom_books;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can manage their own shelf books"
  ON public.user_books FOR ALL TO authenticated
  USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can manage custom books"
  ON public.custom_books FOR ALL TO authenticated
  USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
