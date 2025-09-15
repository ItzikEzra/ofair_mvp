-- Update get_my_professional_ratings function to accept token parameter
CREATE OR REPLACE FUNCTION public.get_my_professional_ratings(token_param text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, rating_overall numeric, rating_quality numeric, rating_timing numeric, rating_communication numeric, rating_value numeric, rating_cleanliness numeric, rating_recommendation numeric, weighted_average numeric, created_at timestamp with time zone, recommendation text, customer_initials text, customer_phone_masked text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_professional_id uuid;
  professional_phone_var text;
BEGIN
  -- Get current professional ID using the token parameter
  SELECT get_current_professional_id_secure(token_param) INTO current_professional_id;
  
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
$function$