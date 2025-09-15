
-- Add languages column to professionals table
ALTER TABLE public.professionals 
ADD COLUMN languages text[] DEFAULT '{}';

-- Update the column to be not null with empty array as default
ALTER TABLE public.professionals 
ALTER COLUMN languages SET NOT NULL;
