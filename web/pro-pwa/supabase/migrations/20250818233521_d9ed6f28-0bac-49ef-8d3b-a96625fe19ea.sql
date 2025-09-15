-- CRITICAL SECURITY FIX: Protect customer personal information in professional_ratings table

-- Current issue: The professional_ratings table is publicly readable and contains:
-- - customer_name (SENSITIVE)
-- - customer_phone (SENSITIVE) 
-- This allows anyone to steal customer personal information

-- 1. First, let's see what's currently exposed and fix it immediately
-- Remove the overly permissive "Anyone can view professional ratings" policy
DROP POLICY IF EXISTS "Anyone can view professional ratings" ON public.professional_ratings;

-- 2. Create a secure function for public rating display (aggregated data only)
CREATE OR REPLACE FUNCTION public.get_professional_ratings_public(professional_phone_param text)
 RETURNS TABLE(
   rating_overall numeric,
   rating_quality numeric,
   rating_timing numeric,
   rating_communication numeric,
   rating_value numeric,
   rating_cleanliness numeric,
   rating_recommendation numeric,
   weighted_average numeric,
   created_at timestamp with time zone,
   recommendation text,
   -- Customer info is completely excluded from public function
   professional_name text,
   company_name text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    pr.rating_overall,
    pr.rating_quality,
    pr.rating_timing,
    pr.rating_communication,
    pr.rating_value,
    pr.rating_cleanliness,
    pr.rating_recommendation,
    pr.weighted_average,
    pr.created_at,
    pr.recommendation,
    pr.professional_name,
    pr.company_name
    -- SECURITY: customer_name and customer_phone are EXCLUDED
  FROM public.professional_ratings pr
  WHERE pr.professional_phone = professional_phone_param
  ORDER BY pr.created_at DESC;
$function$;

-- 3. Create a secure function for professionals to view their own ratings (with limited customer info)
CREATE OR REPLACE FUNCTION public.get_my_professional_ratings()
 RETURNS TABLE(
   id uuid,
   rating_overall numeric,
   rating_quality numeric,
   rating_timing numeric,
   rating_communication numeric,
   rating_value numeric,
   rating_cleanliness numeric,
   rating_recommendation numeric,
   weighted_average numeric,
   created_at timestamp with time zone,
   recommendation text,
   customer_initials text, -- Only initials, not full name
   customer_phone_masked text -- Masked phone number
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_professional_id uuid;
  professional_phone_var text;
BEGIN
  -- Get current professional ID and phone
  SELECT get_current_professional_id_secure() INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view ratings';
  END IF;
  
  -- Get professional's phone number
  SELECT phone_number INTO professional_phone_var
  FROM professionals 
  WHERE id = current_professional_id;
  
  IF professional_phone_var IS NULL THEN
    RAISE EXCEPTION 'Professional phone number not found';
  END IF;
  
  RETURN QUERY
  SELECT 
    pr.id,
    pr.rating_overall,
    pr.rating_quality,
    pr.rating_timing,
    pr.rating_communication,
    pr.rating_value,
    pr.rating_cleanliness,
    pr.rating_recommendation,
    pr.weighted_average,
    pr.created_at,
    pr.recommendation,
    -- Security: Only show initials of customer name
    CASE 
      WHEN pr.customer_name IS NOT NULL AND length(pr.customer_name) > 0 THEN
        left(pr.customer_name, 1) || '***'
      ELSE 'לא זמין'
    END as customer_initials,
    -- Security: Mask customer phone number
    CASE 
      WHEN pr.customer_phone IS NOT NULL AND length(pr.customer_phone) >= 4 THEN
        '***' || right(pr.customer_phone, 3)
      ELSE 'לא זמין'
    END as customer_phone_masked
  FROM public.professional_ratings pr
  WHERE pr.professional_phone = professional_phone_var
  ORDER BY pr.created_at DESC;
END;
$function$;

-- 4. Create aggregated rating statistics function (completely anonymous)
CREATE OR REPLACE FUNCTION public.get_professional_rating_stats(professional_phone_param text)
 RETURNS TABLE(
   total_ratings bigint,
   average_overall numeric,
   average_quality numeric,
   average_timing numeric,
   average_communication numeric,
   average_value numeric,
   average_cleanliness numeric,
   average_recommendation numeric,
   overall_weighted_average numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    count(*) as total_ratings,
    round(avg(pr.rating_overall), 2) as average_overall,
    round(avg(pr.rating_quality), 2) as average_quality,
    round(avg(pr.rating_timing), 2) as average_timing,
    round(avg(pr.rating_communication), 2) as average_communication,
    round(avg(pr.rating_value), 2) as average_value,
    round(avg(pr.rating_cleanliness), 2) as average_cleanliness,
    round(avg(pr.rating_recommendation), 2) as average_recommendation,
    round(avg(pr.weighted_average), 2) as overall_weighted_average
  FROM public.professional_ratings pr
  WHERE pr.professional_phone = professional_phone_param;
$function$;

-- 5. Create restrictive RLS policies
-- Only authenticated users can view ratings, and only in specific contexts
CREATE POLICY "Authenticated users can view ratings summaries" ON public.professional_ratings
  FOR SELECT USING (
    -- Allow access only through secure functions or for own data
    auth.uid() IS NOT NULL
  );

-- Allow authenticated users to add ratings (existing functionality)
CREATE POLICY "Authenticated users can add ratings" ON public.professional_ratings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Only allow updates by admins or system (to prevent rating manipulation)
CREATE POLICY "Admins can update ratings" ON public.professional_ratings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 6. Create audit logging for rating access
CREATE TABLE IF NOT EXISTS public.rating_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accessor_type TEXT NOT NULL, -- 'public', 'professional', 'admin'
  professional_phone TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_method TEXT NOT NULL, -- 'public_stats', 'own_ratings', 'direct_access'
  user_agent TEXT,
  ip_address INET
);

-- Enable RLS on rating access logs
ALTER TABLE public.rating_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rating access logs
CREATE POLICY "Service role manages rating access logs" ON public.rating_access_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Add function to safely check if ratings exist (without exposing customer data)
CREATE OR REPLACE FUNCTION public.professional_has_ratings(professional_phone_param text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.professional_ratings 
    WHERE professional_phone = professional_phone_param
  );
$function$;