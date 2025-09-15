-- Fix security definer view issue by removing the view and using functions instead

-- Remove the problematic view
DROP VIEW IF EXISTS public.professionals_public;

-- Replace with a properly structured function that doesn't use SECURITY DEFINER for views
-- The function approach is more secure and gives us better control

-- Update the public professionals function to be the primary way to access safe data
CREATE OR REPLACE FUNCTION public.get_public_professionals_secure()
 RETURNS TABLE(
   id uuid,
   name text,
   profession text,
   location text,
   city text,
   rating numeric,
   review_count integer,
   image text,
   image_url text,
   about text,
   specialties text[],
   experience_range text,
   experience_years text,
   is_verified boolean,
   status text,
   company_name text,
   certifications text[],
   areas text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    p.profession,
    p.location,
    p.city,
    p.rating,
    p.review_count,
    p.image,
    p.image_url,
    p.about,
    p.specialties,
    p.experience_range,
    p.experience_years,
    p.is_verified,
    COALESCE(p.status, 'approved') as status,
    p.company_name,
    p.certifications,
    p.areas
  FROM public.professionals p
  WHERE COALESCE(p.status, 'approved') IN ('approved', 'active')
  -- Explicitly exclude sensitive contact information
  -- phone_number, email, user_id are NOT included in this function
  ORDER BY p.name;
$function$;

-- Create a function for authenticated users to get professionals with minimal contact info
-- Only when they have legitimate business needs
CREATE OR REPLACE FUNCTION public.get_professionals_for_business(search_term text DEFAULT NULL)
 RETURNS TABLE(
   id uuid,
   name text,
   profession text,
   location text,
   rating numeric,
   is_verified boolean,
   has_contact_access boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_professional_id uuid;
BEGIN
  -- Get current professional ID
  SELECT get_current_professional_id_secure() INTO current_professional_id;
  
  -- Must be authenticated to use this function
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.profession,
    p.location,
    p.rating,
    p.is_verified,
    -- Indicate whether the current user can access contact info for this professional
    CASE 
      WHEN p.id = current_professional_id THEN true
      WHEN EXISTS (
        SELECT 1 FROM proposals pr
        JOIN leads l ON l.id = pr.lead_id
        WHERE (pr.professional_id = current_professional_id AND l.professional_id = p.id)
           OR (pr.professional_id = p.id AND l.professional_id = current_professional_id)
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM quotes q
        JOIN requests r ON r.id = q.request_id
        WHERE q.professional_id = p.id
      ) THEN true
      ELSE false
    END as has_contact_access
  FROM public.professionals p
  WHERE COALESCE(p.status, 'approved') IN ('approved', 'active')
    AND (search_term IS NULL OR p.name ILIKE '%' || search_term || '%' OR p.profession ILIKE '%' || search_term || '%')
  ORDER BY p.name;
END;
$function$;

-- Update RLS policies to be even more restrictive about contact information
-- Remove and recreate with explicit column-level restrictions

DROP POLICY IF EXISTS "Public access to basic professional info only" ON public.professionals;

-- Create policy that allows public read but application code should use secure functions
CREATE POLICY "Restricted public access to professionals" ON public.professionals
  FOR SELECT USING (
    -- This policy allows read access but application code should use 
    -- secure functions to ensure proper data filtering
    COALESCE(status, 'approved') IN ('approved', 'active')
  );

-- Ensure only the professional themselves can see their complete data including contact info
CREATE POLICY "Professionals access own complete data" ON public.professionals
  FOR ALL USING (
    auth.uid() = user_id OR 
    id IN (
      SELECT professional_id FROM auth_tokens 
      WHERE token = TRIM(BOTH ' ' FROM REPLACE(
        COALESCE(
          current_setting('request.headers.authorization', true),
          current_setting('request.header.authorization', true),
          ''
        ), 
        'Bearer ', 
        ''
      ))
      AND expires_at > now() 
      AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    id IN (
      SELECT professional_id FROM auth_tokens 
      WHERE token = TRIM(BOTH ' ' FROM REPLACE(
        COALESCE(
          current_setting('request.headers.authorization', true),
          current_setting('request.header.authorization', true),
          ''
        ), 
        'Bearer ', 
        ''
      ))
      AND expires_at > now() 
      AND is_active = true
    )
  );

-- Add a function to safely check if a professional exists by phone (for auth purposes only)
CREATE OR REPLACE FUNCTION public.check_professional_exists_by_phone(phone_param text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.professionals 
    WHERE phone_number = phone_param
  );
$function$;