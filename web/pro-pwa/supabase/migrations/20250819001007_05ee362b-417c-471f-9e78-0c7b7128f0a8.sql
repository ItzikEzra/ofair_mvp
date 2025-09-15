-- CRITICAL SECURITY FIX: Stop harvesting of professional contact information

-- 1. Immediately restrict professional_ratings table access completely
DROP POLICY IF EXISTS "Authenticated users can view ratings summaries only" ON public.professional_ratings;

-- Create extremely restrictive policy - NO direct table access allowed
CREATE POLICY "No direct access to professional_ratings" ON public.professional_ratings
  FOR SELECT USING (false); -- Completely block direct access

-- 2. Fix the proposals table to prevent professional contact harvesting through joins
-- The problem: Current policies allow proposals to be joined with professionals table exposing phone numbers

-- Remove permissive proposal policies that allow broad access
DROP POLICY IF EXISTS "OTP users can view their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Professionals can view their own proposals" ON public.proposals;

-- Create secure proposal access policies
CREATE POLICY "Professionals can view own proposals only" ON public.proposals
  FOR SELECT USING (
    -- Only professionals can see their own proposals, no joins with sensitive professional data
    professional_id IN (
      SELECT id FROM professionals 
      WHERE user_id = auth.uid() OR id IN (
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
  );

-- Create secure lead owner access to proposals on their leads
CREATE POLICY "Lead owners can view proposals securely" ON public.proposals
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads l 
      WHERE l.professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid() OR id IN (
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
    )
  );

-- 3. Create secure edge function for getting proposals WITHOUT exposing contact info
CREATE OR REPLACE FUNCTION public.get_proposals_secure(lead_id_param uuid DEFAULT NULL, professional_id_param uuid DEFAULT NULL)
 RETURNS TABLE(
   id uuid,
   professional_id uuid,
   lead_id uuid,
   price numeric,
   description text,
   status text,
   created_at timestamp with time zone,
   estimated_completion text,
   -- Professional info WITHOUT contact details
   professional_name text,
   professional_profession text,
   professional_location text,
   professional_rating numeric,
   professional_verified boolean
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
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view proposals';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.professional_id,
    p.lead_id,
    p.price,
    p.description,
    p.status,
    p.created_at,
    p.estimated_completion,
    -- Professional info WITHOUT phone/email
    pr.name as professional_name,
    pr.profession as professional_profession,
    pr.location as professional_location,
    pr.rating as professional_rating,
    pr.is_verified as professional_verified
    -- SECURITY: phone_number and email are EXCLUDED
  FROM proposals p
  JOIN professionals pr ON pr.id = p.professional_id
  WHERE 
    -- Only show proposals where user has legitimate access
    (lead_id_param IS NULL OR p.lead_id = lead_id_param) AND
    (professional_id_param IS NULL OR p.professional_id = professional_id_param) AND
    (
      -- Own proposals
      p.professional_id = current_professional_id OR
      -- Proposals on own leads
      p.lead_id IN (
        SELECT l.id FROM leads l 
        WHERE l.professional_id = current_professional_id
      )
    )
  ORDER BY p.created_at DESC;
END;
$function$;

-- 4. Create function to get professional ratings WITHOUT any contact information
CREATE OR REPLACE FUNCTION public.get_professional_ratings_public_safe(professional_id_param uuid)
 RETURNS TABLE(
   rating_overall numeric,
   rating_quality numeric,
   rating_timing numeric,
   rating_communication numeric,
   rating_value numeric,
   rating_cleanliness numeric,
   total_reviews bigint,
   average_rating numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- Get professional phone to match ratings, but don't expose it
  WITH professional_phone AS (
    SELECT phone_number FROM professionals WHERE id = professional_id_param
  )
  SELECT 
    round(avg(pr.rating_overall), 2) as rating_overall,
    round(avg(pr.rating_quality), 2) as rating_quality,
    round(avg(pr.rating_timing), 2) as rating_timing,
    round(avg(pr.rating_communication), 2) as rating_communication,
    round(avg(pr.rating_value), 2) as rating_value,
    round(avg(pr.rating_cleanliness), 2) as rating_cleanliness,
    count(*) as total_reviews,
    round(avg(pr.weighted_average), 2) as average_rating
    -- SECURITY: NO customer or professional contact information exposed
  FROM professional_ratings pr, professional_phone pp
  WHERE pr.professional_phone = pp.phone_number;
$function$;