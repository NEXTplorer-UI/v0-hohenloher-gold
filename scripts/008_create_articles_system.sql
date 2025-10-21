-- =====================================================
-- Articles System Setup
-- =====================================================
-- This script creates the complete articles/blog system including:
-- 1. Storage bucket for article images
-- 2. Articles table with SEO and publishing features
-- 3. RLS policies for security
-- 4. Triggers and indexes for performance

-- =====================================================
-- 1. Storage Bucket for Article Images
-- =====================================================

-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'articles',
  'articles',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Anyone can view article images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'articles');

CREATE POLICY "Authenticated users can upload article images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'articles' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update article images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'articles' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete article images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'articles' 
    AND auth.role() = 'authenticated'
  );

-- =====================================================
-- 2. Articles Table
-- =====================================================

CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  
  -- Content
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  
  -- Media
  image_url TEXT,
  
  -- Metadata
  category TEXT NOT NULL DEFAULT 'article' CHECK (category IN ('article', 'recipe')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,
  
  -- Author (Foreign Key to profiles)
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author TEXT NOT NULL, -- Fallback display name
  
  -- Publishing
  published_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT published_date_check CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR 
    (status != 'published')
  )
);

-- =====================================================
-- 3. Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);

-- =====================================================
-- 4. Triggers
-- =====================================================

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Automatically set published_at when status changes to published
  IF NEW.status = 'published' AND OLD.status != 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();

-- =====================================================
-- 5. RLS Policies
-- =====================================================

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Public can view published articles
CREATE POLICY "Anyone can view published articles"
  ON articles FOR SELECT
  USING (status = 'published');

-- Authenticated users can view all articles (for admin)
CREATE POLICY "Authenticated users can view all articles"
  ON articles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert articles
CREATE POLICY "Authenticated users can insert articles"
  ON articles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update articles
CREATE POLICY "Authenticated users can update articles"
  ON articles FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete articles
CREATE POLICY "Authenticated users can delete articles"
  ON articles FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- Setup Complete
-- =====================================================
