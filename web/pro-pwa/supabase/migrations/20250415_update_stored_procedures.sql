
-- Create a stored procedure for submitting lead proposals
CREATE OR REPLACE FUNCTION public.submit_proposal(
  p_professional_id UUID,
  p_lead_id UUID,
  p_price NUMERIC,
  p_description TEXT,
  p_estimated_completion TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.proposals (
    professional_id,
    lead_id,
    price,
    description,
    estimated_completion,
    status
  ) VALUES (
    p_professional_id,
    p_lead_id,
    p_price,
    p_description,
    p_estimated_completion,
    'pending'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create stored procedure for fetching active leads
CREATE OR REPLACE FUNCTION public.fetch_active_leads()
RETURNS SETOF public.leads
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.leads WHERE status = 'active' ORDER BY created_at DESC;
$$;

-- Create stored procedure for submitting a lead
CREATE OR REPLACE FUNCTION public.submit_lead(
  p_professional_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_location TEXT,
  p_budget NUMERIC,
  p_share_percentage INT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.leads (
    professional_id,
    title,
    description,
    location,
    budget,
    share_percentage,
    status
  ) VALUES (
    p_professional_id,
    p_title,
    p_description,
    p_location,
    p_budget,
    p_share_percentage,
    'active'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
