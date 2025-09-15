-- Add policy to allow professionals to access their own referrals using professional_id
CREATE POLICY "allow_professional_access_referrals" ON public.referrals
FOR ALL
USING (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
))
WITH CHECK (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));