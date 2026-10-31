-- ====================================================================
-- Munazara Voice Rooms Database Migration & RLS Security Policies
-- Compatible with Supabase, Cloud SQL (PostgreSQL), and Neon
-- ====================================================================

-- 1. Create or alter rooms table to support Voice and Free Talk
ALTER TABLE IF EXISTS rooms
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) DEFAULT 'text' CHECK (mode IN ('text', 'voice')),
  ADD COLUMN IF NOT EXISTS free_talk BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS turn_started_at BIGINT,
  ADD COLUMN IF NOT EXISTS max_duration_minutes INT DEFAULT 120,
  ADD COLUMN IF NOT EXISTS banned_user_ids TEXT[] DEFAULT '{}';

-- 2. Create reports table for voice room moderation
CREATE TABLE IF NOT EXISTS debate_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(100) NOT NULL,
  reporter_id VARCHAR(100) NOT NULL,
  reporter_name VARCHAR(255) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  target_name VARCHAR(255) NOT NULL,
  target_role VARCHAR(50) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for speedy moderation lookups
CREATE INDEX IF NOT EXISTS idx_debate_reports_room_id ON debate_reports(room_id);
CREATE INDEX IF NOT EXISTS idx_debate_reports_status ON debate_reports(status);

-- 3. Row-Level Security (RLS) Policies
ALTER TABLE debate_reports ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user or guest to insert safety reports
CREATE POLICY "Anyone can submit a moderation report"
  ON debate_reports
  FOR INSERT
  WITH CHECK (true);

-- Only admins / moderators can view moderation reports
CREATE POLICY "Moderators can view reports"
  ON debate_reports
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'moderator'
    OR auth.jwt() ->> 'role' = 'admin'
    OR auth.uid()::text = reporter_id
  );
