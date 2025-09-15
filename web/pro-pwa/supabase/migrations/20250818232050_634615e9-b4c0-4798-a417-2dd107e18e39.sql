-- Fix remaining function security issues for search path

-- Fix remaining functions with missing search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ 
BEGIN 
  DELETE FROM auth_tokens WHERE expires_at < NOW() OR is_active = false; 
END; 
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
    -- Function logic here
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_leads()
 RETURNS SETOF leads
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT * FROM public.leads WHERE status = 'active' ORDER BY created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.update_issue_reports_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_lead(p_professional_id uuid, p_title text, p_description text, p_location text, p_budget numeric, p_share_percentage integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.insert_proposal(p_professional_id uuid, p_lead_id uuid, p_price numeric, p_description text, p_estimated_completion text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_proposal(p_professional_id uuid, p_lead_id uuid, p_price numeric, p_description text, p_estimated_completion text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fetch_active_leads()
 RETURNS SETOF leads
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT * FROM public.leads WHERE status = 'active' ORDER BY created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.submit_lead(p_professional_id uuid, p_title text, p_description text, p_location text, p_budget numeric, p_share_percentage integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- phone number or IP
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits
CREATE POLICY "Service role manages rate limits" ON public.auth_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON public.auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_last_attempt ON public.auth_rate_limits(last_attempt_at);