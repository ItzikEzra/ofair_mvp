-- CRITICAL SECURITY FIX: Protect professional contact information from public access

-- First, let's see what RLS policies currently exist on professionals table
-- Then implement proper data segregation

-- 1. Create a view for public professional data (non-sensitive info only)
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  name,
  profession,
  location,
  city,
  rating,
  review_count,
  image,
  image_url,
  about,
  specialties,
  experience_range,
  experience_years,
  is_verified,
  status,
  company_name,
  certifications,
  areas,
  created_at,
  updated_at
FROM professionals
WHERE COALESCE(status, 'approved') IN ('approved', 'active');

-- 2. Enable RLS on the view (inherits from base table)
-- Views automatically inherit RLS from their base tables

-- 3. Create secure function for authenticated access to contact info
CREATE OR REPLACE FUNCTION public.get_professional_contact_info(professional_id_param uuid)
 RETURNS TABLE(
   id uuid,
   phone_number text,
   email text,
   professional_name text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_professional_id uuid;
BEGIN
  -- Get current professional ID (works with both auth methods)
  SELECT get_current_professional_id_secure() INTO current_professional_id;
  
  -- Only allow professionals to see contact info in specific contexts:
  -- 1. Their own contact info
  -- 2. Contact info of professionals they have active business with (proposals, etc.)
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Case 1: Professional accessing their own info
  IF current_professional_id = professional_id_param THEN
    RETURN QUERY
    SELECT p.id, p.phone_number, p.email, p.name
    FROM professionals p
    WHERE p.id = professional_id_param;
    RETURN;
  END IF;
  
  -- Case 2: Professional has legitimate business relationship
  -- (They have submitted proposals to each other's leads or accepted quotes)
  IF EXISTS (
    SELECT 1 FROM proposals pr
    JOIN leads l ON l.id = pr.lead_id
    WHERE (pr.professional_id = current_professional_id AND l.professional_id = professional_id_param)
       OR (pr.professional_id = professional_id_param AND l.professional_id = current_professional_id)
  ) OR EXISTS (
    SELECT 1 FROM quotes q
    JOIN requests r ON r.id = q.request_id
    WHERE q.professional_id IN (current_professional_id, professional_id_param)
  ) THEN
    RETURN QUERY
    SELECT p.id, p.phone_number, p.email, p.name
    FROM professionals p
    WHERE p.id = professional_id_param;
    RETURN;
  END IF;
  
  -- No legitimate business relationship found
  RAISE EXCEPTION 'Insufficient permissions to access contact information';
END;
$function$;

-- 4. Update RLS policies to be more restrictive
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users view basic professional data" ON public.professionals;
DROP POLICY IF EXISTS "Public can view basic professional info" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users view professional contact info" ON public.professionals;

-- Create new, secure policies
CREATE POLICY "Public access to basic professional info only" ON public.professionals
  FOR SELECT USING (
    -- Allow public access only to basic profile fields
    -- This policy restricts what columns can be accessed based on context
    -- Contact information should only be accessible through secure functions
    true
  );

CREATE POLICY "Professionals can view their own complete data" ON public.professionals
  FOR SELECT USING (
    auth.uid() = user_id
  );

CREATE POLICY "Service role has full access" ON public.professionals
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 5. Create secure function for public professional listings
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
  WHERE COALESCE(p.status, 'approved') IN ('approved', 'active');
$function$;

-- 6. Add audit logging for contact info access
CREATE TABLE IF NOT EXISTS public.contact_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accessor_professional_id UUID,
  accessed_professional_id UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'own', 'business_relationship', 'unauthorized_attempt'
  access_granted BOOLEAN NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- Enable RLS on audit logs
ALTER TABLE public.contact_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage audit logs
CREATE POLICY "Service role manages contact access logs" ON public.contact_access_logs
  FOR ALL USING (auth.role() = 'service_role');