-- Supabase Database Schema for Pulse60
-- This script creates the `posts` table for storing YouTube and Instagram links.

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('youtube', 'instagram')),
  url TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: You can add Row Level Security (RLS) policies here if you add authentication later.
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
