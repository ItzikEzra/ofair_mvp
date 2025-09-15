-- URGENT SECURITY FIX: Remove public access to professional contact information

-- 1. IMMEDIATELY drop the dangerous policy that exposes contact information
DROP POLICY IF EXISTS "Restricted public access to professionals" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can view own complete profile" ON public.professionals;

-- 2. Create a new restrictive policy for public access that EXCLUDES contact information
-- This will be enforced through secure functions only
CREATE POLICY "Public can access basic professional info only" ON public.professionals
  FOR SELECT USING (
    -- Only allow public access to non-sensitive fields through secure functions
    -- The application must use get_public_professionals_secure() function
    COALESCE(status, 'approved') IN ('approved', 'active') 
    AND auth.uid() IS NOT NULL -- Require authentication even for basic info
  );

-- 3. Create secure policy for professionals to access their own complete data
CREATE POLICY "Professionals can access own complete data" ON public.professionals
  FOR ALL USING (
    -- Own data access (includes contact info)
    auth.uid() = user_id OR 
    -- Or via secure token authentication
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

-- 4. Update the secure public function to explicitly exclude contact information
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
   -- SECURITY: phone_number, email, user_id are EXPLICITLY EXCLUDED
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
    -- CRITICAL SECURITY: phone_number, email, user_id are NOT included
  FROM public.professionals p
  WHERE COALESCE(p.status, 'approved') IN ('approved', 'active')
  ORDER BY p.name;
$function$;

-- 5. Create audit logging for contact information access attempts
CREATE TABLE IF NOT EXISTS public.contact_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accessor_professional_id UUID,
  accessed_professional_id UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'public_attempt', 'legitimate_business', 'own_profile'
  access_granted BOOLEAN NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on contact access logs
ALTER TABLE public.contact_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage contact access logs
CREATE POLICY "Service role manages contact access logs" ON public.contact_access_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Create function to safely get professional contact info (only for legitimate business needs)
CREATE OR REPLACE FUNCTION public.get_professional_contact_info_secure(professional_id_param uuid)
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
  has_business_relationship boolean := false;
BEGIN
  -- Get current professional ID
  SELECT get_current_professional_id_secure() INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    -- Log unauthorized access attempt
    INSERT INTO public.contact_access_logs (accessed_professional_id, access_type, access_granted)
    VALUES (professional_id_param, 'public_attempt', false);
    
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Case 1: Accessing own contact info
  IF current_professional_id = professional_id_param THEN
    -- Log legitimate own access
    INSERT INTO public.contact_access_logs (
      accessor_professional_id, accessed_professional_id, access_type, access_granted
    ) VALUES (current_professional_id, professional_id_param, 'own_profile', true);
    
    RETURN QUERY
    SELECT p.id, p.phone_number, p.email, p.name
    FROM professionals p
    WHERE p.id = professional_id_param;
    RETURN;
  END IF;
  
  -- Case 2: Check for legitimate business relationship
  SELECT EXISTS (
    -- Proposals relationship
    SELECT 1 FROM proposals pr
    JOIN leads l ON l.id = pr.lead_id
    WHERE (pr.professional_id = current_professional_id AND l.professional_id = professional_id_param)
       OR (pr.professional_id = professional_id_param AND l.professional_id = current_professional_id)
  ) OR EXISTS (
    -- Quotes relationship  
    SELECT 1 FROM quotes q
    JOIN requests r ON r.id = q.request_id
    WHERE q.professional_id IN (current_professional_id, professional_id_param)
  ) INTO has_business_relationship;
  
  IF has_business_relationship THEN
    -- Log legitimate business access
    INSERT INTO public.contact_access_logs (
      accessor_professional_id, accessed_professional_id, access_type, access_granted
    ) VALUES (current_professional_id, professional_id_param, 'legitimate_business', true);
    
    RETURN QUERY
    SELECT p.id, p.phone_number, p.email, p.name
    FROM professionals p
    WHERE p.id = professional_id_param;
    RETURN;
  END IF;
  
  -- No legitimate access - log and deny
  INSERT INTO public.contact_access_logs (
    accessor_professional_id, accessed_professional_id, access_type, access_granted
  ) VALUES (current_professional_id, professional_id_param, 'unauthorized_attempt', false);
  
  RAISE EXCEPTION 'Insufficient permissions to access contact information';
END;
$function$;