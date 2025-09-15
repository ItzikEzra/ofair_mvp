-- Allow price to be NULL in proposals table
ALTER TABLE public.proposals ALTER COLUMN price DROP NOT NULL;