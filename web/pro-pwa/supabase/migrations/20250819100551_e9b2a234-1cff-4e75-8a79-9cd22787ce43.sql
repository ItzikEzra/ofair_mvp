-- CRITICAL SECURITY FIX: Add RLS policies to tables with public access
-- This prevents unauthorized access to sensitive business data

-- Fix notifications table - restrict to professional owners and admins
DROP POLICY IF EXISTS "Allow access to notifications by professional_id" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete notifications by professional_id" ON public.notifications;
DROP POLICY IF EXISTS "Allow inserting notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow update notifications by professional_id" ON public.notifications;
DROP POLICY IF EXISTS "Can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for system" ON public.notifications;
DROP POLICY IF EXISTS "Enable read access for own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable update for own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professional can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professional can read notifications" ON public.notifications;

-- Secure notifications table
CREATE POLICY "Professionals can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Professionals can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Professionals can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Secure quote_payments table - only professionals can see their own payments
CREATE POLICY "Professionals can view their own quote payments" 
ON public.quote_payments 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Professionals can update their own quote payments" 
ON public.quote_payments 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Admins can manage all quote payments" 
ON public.quote_payments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Secure projects table - only professionals can see their own projects
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Professionals can view their own projects" 
ON public.projects 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Professionals can insert their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Professionals can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Professionals can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE user_id = auth.uid()
  ) OR 
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

CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Add security improvements to database functions
-- Fix search_path for security functions to prevent search path attacks

CREATE OR REPLACE FUNCTION public.get_current_professional_id_secure(token_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- First try custom auth tokens (for OTP users) - check parameter first, then header
  SELECT p.id 
  FROM public.professionals p
  JOIN public.auth_tokens at ON at.professional_id = p.id
  WHERE at.token = COALESCE(
    token_param,
    TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
  )
  AND at.expires_at > now()
  AND at.is_active = true
  
  UNION
  
  -- Then try Supabase auth (for email/password users) - only if no token parameter provided
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid() AND token_param IS NULL
  
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_details_for_proposal(proposal_id_param uuid, proposal_type_param text, token_param text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  request_id_var uuid;
  professional_id_var uuid;
  current_professional_id uuid;
BEGIN
  -- Get the current professional ID using the token parameter
  SELECT get_current_professional_id_secure(token_param) INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'לא ניתן לזהות מקצוען';
  END IF;
  
  -- Handle lead proposals
  IF proposal_type_param = 'lead' THEN
    -- Verify the professional owns this proposal
    SELECT p.professional_id INTO professional_id_var
    FROM proposals p
    WHERE p.id = proposal_id_param;
    
    IF professional_id_var != current_professional_id THEN
      RAISE EXCEPTION 'אין הרשאה לגשת לנתונים אלה';
    END IF;
    
    -- Get lead client details
    SELECT jsonb_build_object(
      'name', l.client_name,
      'phone', l.client_phone,
      'address', l.client_address,
      'workDate', l.work_date,
      'workTime', l.work_time,
      'notes', l.notes
    ) INTO result
    FROM proposals p
    JOIN leads l ON l.id = p.lead_id
    WHERE p.id = proposal_id_param;
    
  ELSE
    -- Handle request proposals (quotes)
    -- Verify the professional owns this quote
    SELECT q.professional_id, q.request_id INTO professional_id_var, request_id_var
    FROM quotes q
    WHERE q.id = proposal_id_param;
    
    IF professional_id_var != current_professional_id THEN
      RAISE EXCEPTION 'אין הרשאה לגשת לנתונים אלה';
    END IF;
    
    -- Get request and user profile details
    SELECT jsonb_build_object(
      'name', COALESCE(up.name, 'לא זמין'),
      'phone', COALESCE(up.phone, 'לא זמין'),
      'address', COALESCE(up.address, 'לא זמין'),
      'date', r.date,
      'time', r.timing
    ) INTO result
    FROM requests r
    LEFT JOIN user_profiles up ON up.id = r.user_id
    WHERE r.id = request_id_var;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;