-- CRITICAL SECURITY ANALYSIS: Check professional_certificates security issues
-- Fix the vulnerability where competitors can steal professional certificates

-- Check current RLS policies on professional_certificates
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' AND pc.relname = 'professional_certificates';

-- Check storage buckets for certificates
SELECT id, name, public FROM storage.buckets WHERE name LIKE '%certificate%' OR id LIKE '%certificate%';

-- Check if RLS is enabled on professional_certificates
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'professional_certificates';