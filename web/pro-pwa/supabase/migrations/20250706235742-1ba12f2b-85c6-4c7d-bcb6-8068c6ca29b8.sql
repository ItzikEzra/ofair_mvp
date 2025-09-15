-- Drop the existing policy that only works with Supabase Auth
DROP POLICY IF EXISTS "select_own_quote_payments" ON public.quote_payments;

-- Create new policies that support both Supabase Auth and OTP authentication
CREATE POLICY "Professionals can view their own quote payments" 
ON public.quote_payments 
FOR SELECT 
USING (
  -- For Supabase Auth users
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR 
  -- For OTP users (when auth.uid() is null)
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);

-- Allow inserting quote payment records
CREATE POLICY "Professionals can create quote payment records" 
ON public.quote_payments 
FOR INSERT 
WITH CHECK (
  -- For Supabase Auth users
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR 
  -- For OTP users (when auth.uid() is null) 
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);

-- Allow updating quote payment records
CREATE POLICY "Professionals can update their own quote payments" 
ON public.quote_payments 
FOR UPDATE 
USING (
  -- For Supabase Auth users
  (auth.uid() IS NOT NULL AND professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR 
  -- For OTP users (when auth.uid() is null)
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);