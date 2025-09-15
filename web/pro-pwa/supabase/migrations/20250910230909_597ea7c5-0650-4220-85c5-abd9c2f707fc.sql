-- Fix RLS policy for quotes table to allow INSERT operations
-- Add missing WITH CHECK expression for professionals creating quotes

-- Drop existing policy and recreate with proper check expression
DROP POLICY IF EXISTS "Professionals can create quotes" ON public.quotes;

CREATE POLICY "Professionals can create quotes"
ON public.quotes
FOR INSERT
WITH CHECK (
  -- Professional can only create quotes for themselves (via Supabase auth)
  professional_id IN (
    SELECT professionals.id
    FROM professionals
    WHERE professionals.user_id = auth.uid()
  ) OR
  -- Professional can create quotes using custom auth tokens
  professional_id IN (
    SELECT auth_tokens.professional_id
    FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);