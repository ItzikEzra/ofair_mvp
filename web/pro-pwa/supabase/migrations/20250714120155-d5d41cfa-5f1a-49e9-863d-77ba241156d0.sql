-- Fix RLS policies for quotes table to allow professionals to view their own quotes
CREATE POLICY "Professionals can view their own quotes" 
ON public.quotes 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

-- Also fix the update policy to work with professional lookup
DROP POLICY IF EXISTS "Professionals can update their own quotes" ON public.quotes;

CREATE POLICY "Professionals can update their own quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);