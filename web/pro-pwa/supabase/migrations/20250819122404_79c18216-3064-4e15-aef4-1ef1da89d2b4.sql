-- CRITICAL SECURITY FIX: Remove overly permissive policy on user_messages table
-- This policy was allowing anyone to read all private messages

-- Drop the dangerous "Allow all operations on user_messages" policy
DROP POLICY IF EXISTS "Allow all operations on user_messages" ON public.user_messages;

-- The table already has proper security policies in place:
-- 1. "Users can view their own messages" - allows users to see messages they sent or received
-- 2. "Users can send messages" - allows authenticated users to send messages
-- 3. "Super Admins can view all messages" - allows admin oversight when needed

-- Verify that RLS is enabled (it should already be)
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- Add a security audit note
COMMENT ON TABLE public.user_messages IS 'Private messaging table with secure RLS policies - only senders and recipients can access their messages';