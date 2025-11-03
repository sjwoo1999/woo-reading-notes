-- Week 1: Create notes, links, reminders tables for knowledge graph
-- Created: 2025-11-03

-- 1. Create notes table (core data model)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('book', 'concept', 'quote')),
  title TEXT NOT NULL,
  content TEXT,

  -- Metadata (type-specific)
  metadata JSONB DEFAULT '{}',
  -- book: {author: str, isbn: str, publisher: str, rating: int, progress: int, cover_url: str}
  -- quote: {page: int, source_book_id: uuid}

  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete

  CONSTRAINT title_not_empty CHECK (LENGTH(title) > 0),
  CONSTRAINT user_type_unique UNIQUE(user_id, id) -- For easier querying
);

-- 2. Create links table (relationships between notes)
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('relates_to', 'supports', 'contradicts', 'inspired_by')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT no_self_link CHECK (source_note_id != target_note_id),
  CONSTRAINT unique_link UNIQUE(user_id, source_note_id, target_note_id, relationship_type)
);

-- 3. Create reminders table (spaced repetition)
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'dismissed')),

  interval_level INT DEFAULT 0 CHECK (interval_level BETWEEN 0 AND 3),
  -- 0 = 1d, 1 = 3d, 2 = 7d, 3 = 30d

  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_reminder UNIQUE(user_id, note_id, interval_level, created_at)
);

-- 4. Create profiles table (user metadata)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_type ON notes(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON notes(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-Text Search (Korean support)
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes USING GIN (
  to_tsvector('korean', COALESCE(title, '') || ' ' || COALESCE(content, ''))
) WHERE deleted_at IS NULL;

-- Links indexes (graph optimization)
CREATE INDEX IF NOT EXISTS idx_links_source ON links(user_id, source_note_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(user_id, target_note_id);
CREATE INDEX IF NOT EXISTS idx_links_type ON links(user_id, relationship_type);

-- Reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(user_id, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_note ON reminders(note_id);

-- Enable Row-Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY IF NOT EXISTS "Users can see their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for links
CREATE POLICY IF NOT EXISTS "Users can manage links between own notes" ON links
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for reminders
CREATE POLICY IF NOT EXISTS "Users can manage own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY IF NOT EXISTS "Users can see own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger for notes table
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
