-- Add final_amount column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN final_amount NUMERIC DEFAULT NULL;

-- Add final_amount column to quotes table  
ALTER TABLE public.quotes 
ADD COLUMN final_amount NUMERIC DEFAULT NULL;

-- Add comment to describe the columns
COMMENT ON COLUMN public.proposals.final_amount IS 'Final amount paid for completed proposals';
COMMENT ON COLUMN public.quotes.final_amount IS 'Final amount paid for completed quotes';