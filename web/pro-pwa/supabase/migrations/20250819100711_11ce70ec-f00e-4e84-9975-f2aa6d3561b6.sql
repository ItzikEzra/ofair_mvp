-- CRITICAL SECURITY FIX: Secure tables with missing RLS policies
-- This prevents unauthorized access to sensitive business data

-- Fix quote_payments table - drop existing policies first
DROP POLICY IF EXISTS "Professionals can create quote payment records" ON public.quote_payments;
DROP POLICY IF EXISTS "Professionals can update their own quote payments" ON public.quote_payments;
DROP POLICY IF EXISTS "Professionals can view their own quote payments" ON public.quote_payments;

-- Create secure policies for quote_payments
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

CREATE POLICY "Professionals can create quote payment records" 
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

-- Secure the quotes table if it exists
-- Note: First check if table exists to avoid errors
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Professionals can view their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Professionals can create quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Professionals can update their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Professionals can delete their own quotes" ON public.quotes;
    
    -- Create secure policies for quotes table
    EXECUTE '
    CREATE POLICY "Professionals can view their own quotes" 
    ON public.quotes 
    FOR SELECT 
    USING (
      professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid()
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

    EXECUTE '
    CREATE POLICY "Professionals can create quotes" 
    ON public.quotes 
    FOR INSERT 
    WITH CHECK (
      professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid()
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

    EXECUTE '
    CREATE POLICY "Professionals can update their own quotes" 
    ON public.quotes 
    FOR UPDATE 
    USING (
      professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid()
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

    EXECUTE '
    CREATE POLICY "Admins can manage all quotes" 
    ON public.quotes 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid()
      )
    )';
  END IF;
END $$;

-- Secure the work_completions table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_completions') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Professionals can view their own work completions" ON public.work_completions;
    DROP POLICY IF EXISTS "Professionals can create work completions" ON public.work_completions;
    DROP POLICY IF EXISTS "Professionals can update their own work completions" ON public.work_completions;
    
    -- Create secure policies for work_completions table
    EXECUTE '
    CREATE POLICY "Professionals can view their own work completions" 
    ON public.work_completions 
    FOR SELECT 
    USING (
      professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid()
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

    EXECUTE '
    CREATE POLICY "Professionals can create work completions" 
    ON public.work_completions 
    FOR INSERT 
    WITH CHECK (
      professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid()
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

    EXECUTE '
    CREATE POLICY "Professionals can update their own work completions" 
    ON public.work_completions 
    FOR UPDATE 
    USING (
      professional_id IN (
        SELECT id FROM professionals 
        WHERE user_id = auth.uid()
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

    EXECUTE '
    CREATE POLICY "Admins can manage all work completions" 
    ON public.work_completions 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid()
      )
    )';
  END IF;
END $$;