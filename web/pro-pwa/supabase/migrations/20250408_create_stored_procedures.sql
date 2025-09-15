
-- Create stored procedure for fetching active leads
CREATE OR REPLACE FUNCTION public.get_active_leads()
RETURNS SETOF public.leads
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.leads WHERE status = 'active' ORDER BY created_at DESC;
$$;

-- Create stored procedure for inserting a lead
CREATE OR REPLACE FUNCTION public.insert_lead(
  p_professional_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_location TEXT,
  p_budget NUMERIC,
  p_share_percentage INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_lead_id UUID;
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
  ) RETURNING id INTO new_lead_id;
  
  RETURN new_lead_id;
END;
$$;

-- Create stored procedure for inserting a proposal
CREATE OR REPLACE FUNCTION public.insert_proposal(
  p_professional_id UUID,
  p_lead_id UUID,
  p_price NUMERIC,
  p_description TEXT,
  p_estimated_completion TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_proposal_id UUID;
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
  ) RETURNING id INTO new_proposal_id;
  
  RETURN new_proposal_id;
END;
$$;
