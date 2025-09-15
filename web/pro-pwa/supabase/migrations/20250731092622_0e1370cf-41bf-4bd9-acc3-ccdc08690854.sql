-- Fix RLS policy for lead_payments to allow professionals to see their own payments
DROP POLICY IF EXISTS "Professionals can view their own payments" ON lead_payments;

CREATE POLICY "Professionals can view their own payments" 
ON lead_payments 
FOR SELECT 
USING (
  -- Allow viewing if the user is the professional who performed the work
  (professional_id IN (
    SELECT professionals.id
    FROM professionals
    WHERE professionals.user_id = auth.uid()
  )) 
  OR 
  -- OR if the user owns the lead (lead owner can see payments for their leads)
  (lead_id IN (
    SELECT leads.id
    FROM leads
    WHERE leads.professional_id IN (
      SELECT professionals.id
      FROM professionals
      WHERE professionals.user_id = auth.uid()
    )
  ))
);