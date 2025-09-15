-- Secure the certificate storage bucket - ensure it exists and has proper policies
-- This prevents competitors from directly accessing certificate files

-- Create the professional-certificates storage bucket if it doesn't exist (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-certificates', 'professional-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Remove any overly permissive storage policies on certificates bucket
DELETE FROM storage.policies 
WHERE bucket_id = 'professional-certificates';

-- Create secure storage policies for certificate files
-- Only certificate owners can access their files
INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES (
  'Professionals can view their own certificate files',
  'professional-certificates',
  'SELECT',
  '(SELECT auth.uid()) IN (
    SELECT p.user_id FROM public.professionals p
    JOIN public.professional_certificates pc ON pc.professional_id = p.id
    WHERE pc.certificate_url LIKE ''%'' || objects.name || ''%''
  )'
);

INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES (
  'Professionals can upload their own certificate files',
  'professional-certificates',
  'INSERT',
  '(SELECT auth.uid()) IN (
    SELECT user_id FROM public.professionals 
    WHERE id::text = (storage.foldername(name))[1]
  )'
);

INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES (
  'Professionals can update their own certificate files',
  'professional-certificates',
  'UPDATE',
  '(SELECT auth.uid()) IN (
    SELECT p.user_id FROM public.professionals p
    JOIN public.professional_certificates pc ON pc.professional_id = p.id
    WHERE pc.certificate_url LIKE ''%'' || objects.name || ''%''
  )'
);

INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES (
  'Professionals can delete their own certificate files',
  'professional-certificates',
  'DELETE',
  '(SELECT auth.uid()) IN (
    SELECT p.user_id FROM public.professionals p
    JOIN public.professional_certificates pc ON pc.professional_id = p.id
    WHERE pc.certificate_url LIKE ''%'' || objects.name || ''%''
  )'
);

-- Admin access to certificate files for moderation
INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES (
  'Administrators can view all certificate files',
  'professional-certificates',
  'SELECT',
  'EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = (SELECT auth.uid())
  )'
);