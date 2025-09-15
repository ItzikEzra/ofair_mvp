-- Remove the duplicate get_proposals_secure function (the one without token parameter)
DROP FUNCTION IF EXISTS public.get_proposals_secure();

-- Create secure function for getting icount transactions
CREATE OR REPLACE FUNCTION public.get_icount_transactions_secure(token_param text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid,
  amount numeric,
  created_at timestamp with time zone,
  status text,
  confirmation_code text,
  transaction_type text,
  currency text,
  professional_id uuid
)
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
    RAISE EXCEPTION 'Authentication required to view icount transactions';
  END IF;
  
  RETURN QUERY
  SELECT 
    it.id,
    it.amount,
    it.created_at,
    it.status,
    it.confirmation_code,
    it.transaction_type,
    it.currency,
    it.professional_id
  FROM icount_transactions it
  WHERE it.professional_id = current_professional_id
  ORDER BY it.created_at DESC;
END;
$function$;