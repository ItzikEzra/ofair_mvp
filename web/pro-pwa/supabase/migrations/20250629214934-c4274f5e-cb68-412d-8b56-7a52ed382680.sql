
-- Create professional_certificates table
CREATE TABLE public.professional_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  certificate_name TEXT NOT NULL,
  certificate_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.professional_certificates 
ADD CONSTRAINT fk_professional_certificates_professional_id 
FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE;

-- Enable RLS on professional_certificates table
ALTER TABLE public.professional_certificates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for professional_certificates with simplified logic
CREATE POLICY "Professionals can view their own certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (
  professional_id::text = auth.uid()::text OR
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can insert their own certificates" 
ON public.professional_certificates 
FOR INSERT 
WITH CHECK (
  professional_id::text = auth.uid()::text OR
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can update their own certificates" 
ON public.professional_certificates 
FOR UPDATE 
USING (
  professional_id::text = auth.uid()::text OR
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can delete their own certificates" 
ON public.professional_certificates 
FOR DELETE 
USING (
  professional_id::text = auth.uid()::text OR
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('professional-certificates', 'professional-certificates', true);

-- Create storage policies for certificates bucket
CREATE POLICY "Professionals can upload certificates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'professional-certificates');

CREATE POLICY "Professionals can view certificates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'professional-certificates');

CREATE POLICY "Professionals can update certificates" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'professional-certificates');

CREATE POLICY "Professionals can delete certificates" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'professional-certificates');
