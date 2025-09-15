-- Create function to get quotes for a professional
CREATE OR REPLACE FUNCTION public.get_quotes_secure(token_param text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, professional_id uuid, request_id uuid, price text, description text, status text, created_at timestamp with time zone, estimated_time text, request_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_professional_id uuid;
BEGIN
  -- Get current professional ID using the token parameter
  SELECT get_current_professional_id_secure(token_param) INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view quotes';
  END IF;
  
  RETURN QUERY
  SELECT 
    q.id,
    q.professional_id,
    q.request_id,
    q.price,
    q.description,
    q.status,
    q.created_at,
    q.estimated_time,
    COALESCE(r.status, 'active') as request_status
  FROM quotes q
  LEFT JOIN requests r ON r.id = q.request_id
  WHERE 
    -- Only show quotes where user has legitimate access
    (
      -- Own quotes
      q.professional_id = current_professional_id OR
      -- Quotes on own requests (if they have any)
      q.request_id IN (
        SELECT r.id FROM requests r 
        WHERE r.user_id IN (
          SELECT up.id FROM user_profiles up
          JOIN professionals p ON p.user_id = up.id
          WHERE p.id = current_professional_id
        )
      )
    )
  ORDER BY q.created_at DESC;
END;
$function$;