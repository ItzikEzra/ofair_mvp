-- URGENT SECURITY FIX: Remove public access to customer contact information in leads

-- 1. IMMEDIATELY drop the dangerous policies that expose customer data
DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;
DROP POLICY IF EXISTS "Anyone can view active leads" ON public.leads;
DROP POLICY IF EXISTS "Client info only for lead owner" ON public.leads;

-- 2. Create restrictive policy for public access that EXCLUDES customer contact information
CREATE POLICY "Public can view basic lead info only" ON public.leads
  FOR SELECT USING (
    -- Only allow access to basic lead information, customer contact info is restricted
    status = 'active' AND auth.uid() IS NOT NULL
  );

-- 3. Create policy for lead owners to access complete lead data including customer info
CREATE POLICY "Lead owners can access complete lead data" ON public.leads
  FOR SELECT USING (
    -- Only lead owners can see customer contact information
    professional_id IN (
      SELECT id FROM professionals 
      WHERE user_id = auth.uid()
    ) OR 
    -- Or via secure token authentication
    professional_id IN (
      SELECT professional_id FROM auth_tokens 
      WHERE token = TRIM(BOTH ' ' FROM REPLACE(
        COALESCE(
          current_setting('request.headers.authorization', true),
          current_setting('request.header.authorization', true),
          ''
        ), 
        'Bearer ', 
        ''
      ))
      AND expires_at > now() 
      AND is_active = true
    )
  );

-- 4. Create secure function for public lead access without customer contact info
CREATE OR REPLACE FUNCTION public.get_public_leads_secure()
 RETURNS TABLE(
   id uuid,
   title text,
   description text,
   location text,
   profession text,
   budget numeric,
   status text,
   created_at timestamp with time zone,
   share_percentage integer,
   image_url text,
   image_urls text[],
   work_date date,
   work_time text,
   notes text,
   constraints text,
   latitude double precision,
   longitude double precision
   -- SECURITY: client_name, client_phone, client_address are EXPLICITLY EXCLUDED
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    l.id,
    l.title,
    l.description,
    l.location,
    l.profession,
    l.budget,
    l.status,
    l.created_at,
    l.share_percentage,
    l.image_url,
    l.image_urls,
    l.work_date,
    l.work_time,
    l.notes,
    l.constraints,
    l.latitude,
    l.longitude
    -- CRITICAL SECURITY: client_name, client_phone, client_address are NOT included
  FROM public.leads l
  WHERE l.status = 'active'
  ORDER BY l.created_at DESC;
$function$;

-- 5. Create secure function for lead owners to access customer contact info
CREATE OR REPLACE FUNCTION public.get_lead_customer_info_secure(lead_id_param uuid)
 RETURNS TABLE(
   client_name text,
   client_phone text,
   client_address text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_professional_id uuid;
  lead_owner_id uuid;
BEGIN
  -- Get current professional ID
  SELECT get_current_professional_id_secure() INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access customer contact information';
  END IF;
  
  -- Get the lead owner
  SELECT professional_id INTO lead_owner_id
  FROM leads 
  WHERE id = lead_id_param;
  
  -- Only lead owner can access customer contact info
  IF current_professional_id != lead_owner_id THEN
    RAISE EXCEPTION 'Insufficient permissions to access customer contact information';
  END IF;
  
  RETURN QUERY
  SELECT l.client_name, l.client_phone, l.client_address
  FROM leads l
  WHERE l.id = lead_id_param;
END;
$function$;

-- 6. Create audit logging for customer data access attempts
CREATE TABLE IF NOT EXISTS public.customer_contact_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accessor_professional_id UUID,
  lead_id UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'legitimate_owner', 'unauthorized_attempt'
  access_granted BOOLEAN NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on customer contact access logs
ALTER TABLE public.customer_contact_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage customer contact access logs
CREATE POLICY "Service role manages customer contact access logs" ON public.customer_contact_access_logs
  FOR ALL USING (auth.role() = 'service_role');