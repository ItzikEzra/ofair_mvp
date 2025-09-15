-- Fix the professionals table security by updating existing policies
-- Step 1: Remove overly permissive policies that expose sensitive data
DROP POLICY IF EXISTS "Public can view basic professional info" ON public.professionals;

-- Step 2: Update existing policies to be more restrictive
-- Only authenticated users can access professional data, and application logic will filter sensitive fields
CREATE POLICY "Authenticated users view basic professional data" 
ON public.professionals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create an edge function to handle public access to non-sensitive professional data
CREATE OR REPLACE FUNCTION public.get_public_professionals_basic_info()
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
  is_verified boolean,
  status text
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
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
    p.is_verified,
    COALESCE(p.status, 'approved') as status
  FROM public.professionals p
  WHERE COALESCE(p.status, 'approved') IN ('approved', 'active');
$$;