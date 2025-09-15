
-- Drop existing policies first
DROP POLICY IF EXISTS "Professionals can insert their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can view their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can update their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can delete their own certificates" ON public.professional_certificates;

-- Create new, corrected policies
CREATE POLICY "Professionals can view their own certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can insert their own certificates" 
ON public.professional_certificates 
FOR INSERT 
WITH CHECK (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can update their own certificates" 
ON public.professional_certificates 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can delete their own certificates" 
ON public.professional_certificates 
FOR DELETE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);
