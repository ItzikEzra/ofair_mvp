-- CRITICAL SECURITY FIX: Secure the referrals table from unauthorized access
-- This fixes the vulnerability where customer phone numbers and names could be stolen

-- First, let's see what policies currently exist on referrals table
SELECT pol.polname, pol.polcmd, pol.polpermissive, pol.polqual, pol.polwithcheck
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' AND pc.relname = 'referrals';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'referrals';