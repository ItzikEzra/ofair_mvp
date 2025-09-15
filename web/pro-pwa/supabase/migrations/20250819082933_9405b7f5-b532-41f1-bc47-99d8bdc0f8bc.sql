-- CRITICAL SECURITY ANALYSIS: Check professional_certificates table structure and storage buckets
-- This vulnerability allows competitors to steal professional certificates

-- Check current RLS policies on professional_certificates
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    pol.polqual as using_expression,
    pol.polwithcheck as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' AND pc.relname = 'professional_certificates';

-- Check if there are storage buckets for certificates
SELECT id, name, public FROM storage.buckets WHERE name LIKE '%certificate%' OR id LIKE '%certificate%';

-- Check storage policies for certificate-related buckets
SELECT 
    pol.name as policy_name,
    pol.bucket_id,
    pol.command,
    pol.definition
FROM storage.policies pol
WHERE pol.bucket_id LIKE '%certificate%';