-- Create auth_tokens table for persistent authentication
CREATE TABLE public.auth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  device_info TEXT, -- Optional: to identify device
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_professional_id ON auth_tokens(professional_id);

-- Enable RLS
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

-- Only Edge Functions can access
CREATE POLICY "Service role only" ON auth_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_tokens 
  WHERE expires_at < NOW() 
  OR is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;