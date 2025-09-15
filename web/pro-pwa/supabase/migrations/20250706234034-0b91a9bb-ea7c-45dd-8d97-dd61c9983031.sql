-- הוספת שדות לטבלת work_completions
ALTER TABLE public.work_completions 
ADD COLUMN IF NOT EXISTS final_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_method TEXT;