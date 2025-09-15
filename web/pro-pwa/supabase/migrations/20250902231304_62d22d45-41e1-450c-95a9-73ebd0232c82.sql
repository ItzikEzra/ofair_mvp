-- Create secure function to get clients history with masked customer data
CREATE OR REPLACE FUNCTION public.get_clients_history_secure(token_param text DEFAULT NULL)
RETURNS TABLE(
  transaction_id uuid,
  client_name text,
  client_phone text,
  client_email text,
  client_address text,
  amount numeric,
  payment_method text,
  transaction_date timestamp with time zone,
  transaction_type text,
  title text,
  status text
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
    RAISE EXCEPTION 'Authentication required to view clients history';
  END IF;
  
  RETURN QUERY
  -- Lead payments with client details from leads table
  SELECT 
    lp.id as transaction_id,
    l.client_name,
    l.client_phone,
    NULL::text as client_email,
    l.client_address,
    lp.final_amount as amount,
    lp.payment_method,
    lp.created_at as transaction_date,
    'lead'::text as transaction_type,
    l.title,
    'completed'::text as status
  FROM lead_payments lp
  JOIN leads l ON l.id = lp.lead_id
  WHERE lp.professional_id = current_professional_id
  
  UNION ALL
  
  -- Quote payments with client details from user profiles
  SELECT 
    qp.id as transaction_id,
    up.name as client_name,
    up.phone as client_phone,
    up.email as client_email,
    up.address as client_address,
    qp.final_amount as amount,
    qp.payment_method,
    qp.created_at as transaction_date,
    'quote'::text as transaction_type,
    r.title,
    'completed'::text as status
  FROM quote_payments qp
  JOIN requests r ON r.id = qp.request_id
  LEFT JOIN user_profiles up ON up.id = r.user_id
  WHERE qp.professional_id = current_professional_id
  
  ORDER BY transaction_date DESC;
END;
$function$;