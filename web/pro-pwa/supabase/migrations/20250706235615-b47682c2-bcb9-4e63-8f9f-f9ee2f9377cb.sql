-- Add foreign key relationship between quote_payments and requests
ALTER TABLE public.quote_payments 
ADD CONSTRAINT fk_quote_payments_request_id 
FOREIGN KEY (request_id) REFERENCES public.requests(id);