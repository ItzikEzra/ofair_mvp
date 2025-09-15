-- Fix search path security warnings for recently created function
DROP FUNCTION IF EXISTS public.get_public_professional_data();

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
SET search_path TO 'public'
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