-- Secure certificate storage bucket with correct Supabase storage structure
-- This prevents competitors from accessing certificate files directly

-- Ensure the professional-certificates bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-certificates', 'professional-certificates', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create RLS policies on storage.objects for the certificates bucket
-- These will control access to the actual certificate files

-- Drop any existing policies on storage.objects for this bucket
DROP POLICY IF EXISTS "Certificate owners can view files" ON storage.objects;
DROP POLICY IF EXISTS "Certificate owners can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Certificate owners can update files" ON storage.objects;
DROP POLICY IF EXISTS "Certificate owners can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view certificate files" ON storage.objects;

-- Only professionals can access their own certificate files
CREATE POLICY "Certificate owners can view files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'professional-certificates' AND
  auth.uid() IN (
    SELECT p.user_id FROM public.professionals p
    JOIN public.professional_certificates pc ON pc.professional_id = p.id
    WHERE pc.certificate_url LIKE '%' || objects.name || '%'
  )
);

CREATE POLICY "Certificate owners can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'professional-certificates' AND
  auth.uid() IN (
    SELECT user_id FROM public.professionals 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Certificate owners can update files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'professional-certificates' AND
  auth.uid() IN (
    SELECT p.user_id FROM public.professionals p
    JOIN public.professional_certificates pc ON pc.professional_id = p.id
    WHERE pc.certificate_url LIKE '%' || objects.name || '%'
  )
);

CREATE POLICY "Certificate owners can delete files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'professional-certificates' AND
  auth.uid() IN (
    SELECT p.user_id FROM public.professionals p
    JOIN public.professional_certificates pc ON pc.professional_id = p.id
    WHERE pc.certificate_url LIKE '%' || objects.name || '%'
  )
);

-- Administrators can view all certificate files for moderation
CREATE POLICY "Admins can view certificate files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'professional-certificates' AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);