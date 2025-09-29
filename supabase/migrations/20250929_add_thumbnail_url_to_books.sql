-- Add thumbnail_url to books if missing
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS thumbnail_url text;