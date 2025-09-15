-- Step 1: Fix RLS policies for critical tables

-- Remove conflicting policies on professionals table that use auth.uid() directly
DROP POLICY IF EXISTS "Allow professional registration" ON public.professionals;
DROP POLICY IF EXISTS "Anonymous users can view verified professionals" ON public.professionals;
DROP POLICY IF EXISTS "Public can access verified professionals" ON public.professionals;
DROP POLICY IF EXISTS "Super Admins can manage professionals" ON public.professionals;

-- Keep only the secure policies that use proper authentication
-- The existing policies using get_current_professional_id_secure() are correct

-- Fix notifications policies to work with OTP authentication
DROP POLICY IF EXISTS "Allow inserting notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for system" ON public.notifications;

-- Keep only the comprehensive policy that handles both auth types
-- The existing "Professionals can manage own notifications" policy is correct

-- Fix proposals policies for OTP users
DROP POLICY IF EXISTS "Authenticated users can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "OTP users can update their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Professionals can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Professionals can update their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can view proposals where they are the professional" ON public.proposals;

-- Create unified proposal policies that work with both auth methods
CREATE POLICY "Professionals can manage their own proposals unified" ON public.proposals
FOR ALL USING (
  professional_id IN (
    SELECT professionals.id FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT auth_tokens.professional_id FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true), 
        ''
      ), 
      'Bearer ', ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
)
WITH CHECK (
  professional_id IN (
    SELECT professionals.id FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT auth_tokens.professional_id FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true), 
        ''
      ), 
      'Bearer ', ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);

-- Fix professional_certificates policies 
DROP POLICY IF EXISTS "Administrators can view all certificates" ON public.professional_certificates;

-- The existing comprehensive policy is correct

-- Fix lead_payments policies to ensure data visibility
CREATE POLICY "Professionals can view all their payment data" ON public.lead_payments
FOR SELECT USING (
  professional_id IN (
    SELECT professionals.id FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT auth_tokens.professional_id FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true), 
        ''
      ), 
      'Bearer ', ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);

-- Fix icount_transactions policies
DROP POLICY IF EXISTS "Professionals can insert their own transactions" ON public.icount_transactions;
DROP POLICY IF EXISTS "Professionals can update their own transactions" ON public.icount_transactions;
DROP POLICY IF EXISTS "Professionals can view their own transactions" ON public.icount_transactions;

CREATE POLICY "Professionals can manage their own transactions unified" ON public.icount_transactions
FOR ALL USING (
  professional_id IN (
    SELECT professionals.id FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT auth_tokens.professional_id FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true), 
        ''
      ), 
      'Bearer ', ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
)
WITH CHECK (
  professional_id IN (
    SELECT professionals.id FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT auth_tokens.professional_id FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true), 
        ''
      ), 
      'Bearer ', ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);