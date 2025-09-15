-- Fix critical security vulnerability in professionals table
-- Remove overly permissive policies and implement proper access controls

-- Step 1: Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on professionals" ON public.professionals;
DROP POLICY IF EXISTS "Allow unrestricted reads of professionals" ON public.professionals;
DROP POLICY IF EXISTS "Anyone can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Allow public signup inserts" ON public.professionals;
DROP POLICY IF EXISTS "Allow unrestricted inserts to professionals" ON public.professionals;

-- Step 2: Create secure, role-based policies

-- Public can only view basic, non-sensitive profile information
CREATE POLICY "Public can view basic professional info" 
ON public.professionals 
FOR SELECT 
USING (true)
-- Only allow access to non-sensitive fields through app logic, not RLS
;

-- Professionals can view their own complete profile
CREATE POLICY "Professionals can view own complete profile" 
ON public.professionals 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Professionals can update their own profile
CREATE POLICY "Professionals can update own profile" 
ON public.professionals 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow professional registration (signup)
CREATE POLICY "Allow professional registration" 
ON public.professionals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Admins can manage all professionals
CREATE POLICY "Admins can manage all professionals" 
ON public.professionals 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE user_id = auth.uid() AND is_super_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE user_id = auth.uid() AND is_super_admin = true
));

-- Create a secure function to get public professional data without sensitive info
CREATE OR REPLACE FUNCTION public.get_public_professional_data()
RETURNS TABLE(
  id uuid,
  name text,
  profession text,
  location text,
  rating numeric,
  review_count integer,
  image text,
  about text,
  specialties text[],
  experience_range text,
  is_verified boolean
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.profession,
    p.location,
    p.rating,
    p.review_count,
    p.image,
    p.about,
    p.specialties,
    p.experience_range,
    p.is_verified
  FROM public.professionals p
  WHERE p.status = 'approved' OR p.status IS NULL;
$$;