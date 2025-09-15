-- Fix remaining function search path issues

-- Get the function list to identify which ones need fixing
-- These are the remaining functions that need search_path set

CREATE OR REPLACE FUNCTION public.get_public_professional_data()
 RETURNS TABLE(id uuid, name text, profession text, location text, rating numeric, review_count integer, image text, about text, specialties text[], experience_range text, is_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_public_professionals_basic_info()
 RETURNS TABLE(id uuid, name text, profession text, location text, rating numeric, review_count integer, image text, about text, specialties text[], experience_range text, is_verified boolean, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_current_professional_id_secure(token_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- First try custom auth tokens (for OTP users) - check parameter first, then header
  SELECT p.id 
  FROM public.professionals p
  JOIN public.auth_tokens at ON at.professional_id = p.id
  WHERE at.token = COALESCE(
    token_param,
    TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
  )
  AND at.expires_at > now()
  AND at.is_active = true
  
  UNION
  
  -- Then try Supabase auth (for email/password users) - only if no token parameter provided
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid() AND token_param IS NULL
  
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_projects_for_professional(professional_id_param uuid)
 RETURNS SETOF projects
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT * FROM public.projects 
  WHERE professional_id = professional_id_param
  ORDER BY created_at DESC;
$function$;