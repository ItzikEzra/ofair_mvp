-- Fix RLS policies for OTP authentication and external website access

-- 1. Fix professionals table - allow public access to basic info
DROP POLICY IF EXISTS "Public can access basic professional info only" ON public.professionals;
CREATE POLICY "Public can access basic professional info" 
ON public.professionals 
FOR SELECT 
USING (COALESCE(status, 'approved') IN ('approved', 'active'));

-- 2. Fix referrals table - add public insert policy for external website
CREATE POLICY "Allow public referral creation" 
ON public.referrals 
FOR INSERT 
WITH CHECK (true);

-- 3. Fix leads table - allow public access to basic lead info
DROP POLICY IF EXISTS "Public can view basic lead info only" ON public.leads;
CREATE POLICY "Public can view basic lead info" 
ON public.leads 
FOR SELECT 
USING (status = 'active');

-- 4. Clean up duplicate policies on professionals table
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.professionals;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.professionals;
DROP POLICY IF EXISTS "Users can view own data" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can view their own complete data" ON public.professionals;

-- Keep only the comprehensive policies that work with both Supabase auth and OTP tokens
-- The "Professionals access own complete data" policy already handles both auth methods correctly

-- 5. Ensure notifications work with OTP tokens (already correctly configured)
-- The existing policies for notifications already support OTP tokens via auth_tokens table

-- 6. Ensure proposals work correctly with OTP tokens (already correctly configured)
-- The existing policies already support OTP tokens

-- 7. Update professional_certificates to ensure OTP users can manage certificates
-- (Already correctly configured with OTP token support)