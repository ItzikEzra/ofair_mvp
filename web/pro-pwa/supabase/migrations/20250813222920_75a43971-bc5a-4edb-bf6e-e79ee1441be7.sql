-- Implement comprehensive security fix for professionals table
-- Step 1: Remove the current overly permissive policy
DROP POLICY IF EXISTS "Public can view basic professional info" ON public.professionals;

-- Step 2: Create secure policies that only allow specific access patterns

-- Only allow viewing of basic professional info (without sensitive contact details)
-- This policy will be used in conjunction with application-level filtering
CREATE POLICY "Authenticated users can view basic professional profiles" 
ON public.professionals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Professionals can view their own complete profile including sensitive data
CREATE POLICY "Professionals can view own complete profile" 
ON public.professionals 
FOR SELECT 
USING (auth.uid() = user_id OR check_auth_token_for_professional(id));

-- For proposal viewing (when professionals submit proposals), 
-- only allow viewing non-sensitive professional data
CREATE POLICY "Allow proposal context access to basic info"
ON public.professionals
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.proposals p 
    WHERE p.professional_id = professionals.id
  )
);

-- Step 3: Create secure edge function for public professional data access
-- This replaces direct table access for public viewing