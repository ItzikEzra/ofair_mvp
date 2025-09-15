-- CRITICAL SECURITY FIX: Add RLS policies to tables with public access
-- This prevents unauthorized access to sensitive business data

-- First, drop all existing policies on quote_payments table
DROP POLICY IF EXISTS "Professionals can create quote payment records" ON public.quote_payments;
DROP POLICY IF EXISTS "Professionals can update their own quote payments" ON public.quote_payments;
DROP POLICY IF EXISTS "Professionals can view their own quote payments" ON public.quote_payments;

-- Secure quote_payments table - only professionals can see their own payments
CREATE POLICY "Professionals can view own quote payments" 
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

CREATE POLICY "Professionals can create quote payments" 
ON public.quote_payments 
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

CREATE POLICY "Professionals can update own quote payments" 
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

-- Handle missing quotes and work_completions tables if they exist
-- Add RLS to quotes table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes' AND table_schema = 'public') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Professionals can view their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Professionals can create quotes" ON public.quotes;  
    DROP POLICY IF EXISTS "Professionals can update their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
    
    -- Create secure policies
    EXECUTE 'CREATE POLICY "Professionals can view own quotes" ON public.quotes FOR SELECT USING (
      professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR 
      professional_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Professionals can create quotes" ON public.quotes FOR INSERT WITH CHECK (
      professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR 
      professional_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Professionals can update own quotes" ON public.quotes FOR UPDATE USING (
      professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR 
      professional_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Admins can manage all quotes" ON public.quotes FOR ALL USING (
      EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    )';
  END IF;
END
$$;

-- Handle work_completions table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'work_completions' AND table_schema = 'public') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Professionals can view their own work completions" ON public.work_completions;
    DROP POLICY IF EXISTS "Professionals can create work completions" ON public.work_completions;  
    DROP POLICY IF EXISTS "Professionals can update their own work completions" ON public.work_completions;
    DROP POLICY IF EXISTS "Admins can manage all work completions" ON public.work_completions;
    
    -- Create secure policies
    EXECUTE 'CREATE POLICY "Professionals can view own work completions" ON public.work_completions FOR SELECT USING (
      professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR 
      professional_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Professionals can create work completions" ON public.work_completions FOR INSERT WITH CHECK (
      professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR 
      professional_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Professionals can update own work completions" ON public.work_completions FOR UPDATE USING (
      professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR 
      professional_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Admins can manage all work completions" ON public.work_completions FOR ALL USING (
      EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    )';
  END IF;
END
$$;