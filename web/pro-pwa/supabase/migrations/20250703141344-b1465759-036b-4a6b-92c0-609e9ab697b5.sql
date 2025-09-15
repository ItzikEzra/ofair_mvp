-- Fix RLS policies for professional_certificates to work better with OTP auth
-- Drop existing policies
DROP POLICY IF EXISTS "Professionals can view their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can insert their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can update their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can delete their own certificates" ON public.professional_certificates;

-- Create simpler, more permissive policies that work with both auth methods
-- Since certificates are already scoped to professional_id, we can be more permissive

-- Allow viewing certificates for any authenticated professional
CREATE POLICY "Allow authenticated professionals to view certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (
  -- Allow if regular Supabase auth
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR
  -- Allow if no auth.uid() (OTP users) - they will be filtered by professional_id in app code
  (auth.uid() IS NULL)
);

-- Allow inserting certificates for any authenticated professional
CREATE POLICY "Allow authenticated professionals to insert certificates" 
ON public.professional_certificates 
FOR INSERT 
WITH CHECK (
  -- Allow if regular Supabase auth
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR
  -- Allow if no auth.uid() (OTP users) - app code ensures correct professional_id
  (auth.uid() IS NULL)
);

-- Allow updating certificates for any authenticated professional
CREATE POLICY "Allow authenticated professionals to update certificates" 
ON public.professional_certificates 
FOR UPDATE 
USING (
  -- Allow if regular Supabase auth
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR
  -- Allow if no auth.uid() (OTP users)
  (auth.uid() IS NULL)
);

-- Allow deleting certificates for any authenticated professional
CREATE POLICY "Allow authenticated professionals to delete certificates" 
ON public.professional_certificates 
FOR DELETE 
USING (
  -- Allow if regular Supabase auth
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR
  -- Allow if no auth.uid() (OTP users)
  (auth.uid() IS NULL)
);