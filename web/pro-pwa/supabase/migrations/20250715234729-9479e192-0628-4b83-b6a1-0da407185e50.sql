-- Add notes column to quote_payments table for consistency with lead_payments
ALTER TABLE public.quote_payments 
ADD COLUMN notes text;