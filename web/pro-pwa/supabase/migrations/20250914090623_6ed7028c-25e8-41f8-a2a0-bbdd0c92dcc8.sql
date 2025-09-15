-- Create the professional-certificates storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional-certificates',
  'professional-certificates', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Create RLS policies for the professional-certificates bucket
CREATE POLICY "Public access for professional certificates" ON storage.objects
FOR SELECT USING (bucket_id = 'professional-certificates');

CREATE POLICY "Authenticated users can upload certificates" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'professional-certificates' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own certificates" ON storage.objects
FOR UPDATE USING (bucket_id = 'professional-certificates' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own certificates" ON storage.objects
FOR DELETE USING (bucket_id = 'professional-certificates' AND auth.role() = 'authenticated');