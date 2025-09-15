-- Create secure functions for OTP authentication compatibility

-- Function to get proposals securely with token parameter
CREATE OR REPLACE FUNCTION public.get_proposals_secure(token_param text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid,
  professional_id uuid,
  lead_id uuid,
  price numeric,
  description text,
  status text,
  created_at timestamp with time zone,
  estimated_completion text,
  professional_name text,
  professional_profession text,
  professional_location text,
  professional_rating numeric,
  professional_verified boolean
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
  FROM proposals p
  JOIN professionals pr ON pr.id = p.professional_id
  WHERE 
    -- Only show proposals where user has legitimate access
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

-- Function to submit proposals securely with token parameter
CREATE OR REPLACE FUNCTION public.submit_proposal_secure(
  p_lead_id uuid,
  p_price numeric,
  p_description text,
  p_estimated_completion text DEFAULT NULL::text,
  p_sample_image_url text DEFAULT NULL::text,
  p_lower_price_willing boolean DEFAULT false,
  p_lower_price_value numeric DEFAULT NULL::numeric,
  token_param text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_professional_id uuid;
  new_proposal_id uuid;
BEGIN
  -- Get current professional ID using the token parameter
  SELECT get_current_professional_id_secure(token_param) INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit proposals';
  END IF;
  
  -- Insert the proposal
  INSERT INTO public.proposals (
    professional_id,
    lead_id,
    price,
    description,
    estimated_completion,
    sample_image_url,
    lower_price_willing,
    lower_price_value,
    status
  ) VALUES (
    current_professional_id,
    p_lead_id,
    p_price,
    p_description,
    p_estimated_completion,
    p_sample_image_url,
    p_lower_price_willing,
    p_lower_price_value,
    'pending'
  ) RETURNING id INTO new_proposal_id;
  
  RETURN new_proposal_id;
END;
$function$;

-- Function to get payment history securely with token parameter
CREATE OR REPLACE FUNCTION public.get_my_payments_secure(token_param text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid,
  lead_id uuid,
  proposal_id uuid,
  professional_id uuid,
  final_amount numeric,
  commission_amount numeric,
  share_percentage numeric,
  payment_method text,
  invoice_url text,
  notes text,
  created_at timestamp with time zone,
  lead_title text,
  lead_description text
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
    RAISE EXCEPTION 'Authentication required to view payments';
  END IF;
  
  RETURN QUERY
  SELECT 
    lp.id,
    lp.lead_id,
    lp.proposal_id,
    lp.professional_id,
    lp.final_amount,
    lp.commission_amount,
    lp.share_percentage,
    lp.payment_method,
    lp.invoice_url,
    lp.notes,
    lp.created_at,
    l.title as lead_title,
    l.description as lead_description
  FROM lead_payments lp
  JOIN leads l ON l.id = lp.lead_id
  WHERE lp.professional_id = current_professional_id
  ORDER BY lp.created_at DESC;
END;
$function$;