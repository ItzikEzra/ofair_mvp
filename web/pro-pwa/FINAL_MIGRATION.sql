-- Fix RLS policies for professional_certificates to work with custom auth tokens
-- This addresses the issue where OTP-authenticated users can't upload certificates

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Professionals can insert their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can view their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can update their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can delete their own certificates" ON public.professional_certificates;

-- Step 2: Create new simplified policies that work with both auth methods
CREATE POLICY "Professionals can view their own certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can insert their own certificates" 
ON public.professional_certificates 
FOR INSERT 
WITH CHECK (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can update their own certificates" 
ON public.professional_certificates 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can delete their own certificates" 
ON public.professional_certificates 
FOR DELETE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

-- Step 3: Update storage policies to be more permissive
DROP POLICY IF EXISTS "Professionals can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can update certificates" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete certificates" ON storage.objects;

CREATE POLICY "Anyone can upload to certificates bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'professional-certificates');

CREATE POLICY "Anyone can view certificates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'professional-certificates');

CREATE POLICY "Anyone can update certificates" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'professional-certificates');

CREATE POLICY "Anyone can delete certificates" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'professional-certificates');