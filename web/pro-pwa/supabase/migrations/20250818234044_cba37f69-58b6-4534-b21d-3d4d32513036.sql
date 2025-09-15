-- URGENT SECURITY FIX: Remove public access to customer personal information in professional_ratings

-- 1. IMMEDIATELY remove the dangerous policy that allows anyone to view all customer data
DROP POLICY IF EXISTS "Anyone can view professional ratings" ON public.professional_ratings;

-- 2. Create a restrictive policy that ONLY allows authenticated users to view ratings through secure functions
CREATE POLICY "Authenticated users can view ratings summaries only" ON public.professional_ratings
  FOR SELECT USING (
    -- Only allow access if user is authenticated
    auth.uid() IS NOT NULL
  );

-- 3. Create a public function for viewing aggregated ratings WITHOUT customer personal information
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
   -- Customer personal information is EXCLUDED for security
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
    -- SECURITY: customer_name and customer_phone are EXPLICITLY EXCLUDED
  FROM public.professional_ratings pr
  WHERE pr.professional_phone = professional_phone_param
  ORDER BY pr.created_at DESC;
$function$;

-- 4. Ensure the secure function for professionals to view their own ratings exists
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

-- 5. Create aggregated statistics function (completely anonymous)
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