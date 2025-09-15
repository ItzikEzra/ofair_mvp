-- Create ICOUNT transactions table
CREATE TABLE public.icount_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'commission_payment',
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  icount_transaction_id TEXT,
  confirmation_code TEXT,
  status TEXT DEFAULT 'pending',
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create professional billing details table
CREATE TABLE public.professional_billing_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  vat_id TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.icount_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_billing_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for icount_transactions
CREATE POLICY "Professionals can view their own transactions" 
ON public.icount_transactions 
FOR SELECT 
USING (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Professionals can insert their own transactions" 
ON public.icount_transactions 
FOR INSERT 
WITH CHECK (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Professionals can update their own transactions" 
ON public.icount_transactions 
FOR UPDATE 
USING (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));

-- RLS policies for professional_billing_details
CREATE POLICY "Professionals can view their own billing details" 
ON public.professional_billing_details 
FOR SELECT 
USING (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Professionals can insert their own billing details" 
ON public.professional_billing_details 
FOR INSERT 
WITH CHECK (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Professionals can update their own billing details" 
ON public.professional_billing_details 
FOR UPDATE 
USING (professional_id IN (
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
));

-- Create foreign key relationships
ALTER TABLE public.icount_transactions 
ADD CONSTRAINT fk_icount_transactions_professional 
FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE;

ALTER TABLE public.professional_billing_details 
ADD CONSTRAINT fk_billing_details_professional 
FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_icount_transactions_professional_id ON public.icount_transactions(professional_id);
CREATE INDEX idx_icount_transactions_status ON public.icount_transactions(status);
CREATE INDEX idx_billing_details_professional_id ON public.professional_billing_details(professional_id);