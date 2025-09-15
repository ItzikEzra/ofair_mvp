-- Test the auth token function directly
SELECT 
  '88818681-6e83-4dd1-8e65-e9e35f8e38ee' as test_token,
  current_setting('request.headers.authorization', true) as auth_header,
  current_setting('request.header.authorization', true) as auth_header2;

-- Check if the professional exists and what tokens are active
SELECT 
  p.id, 
  p.name, 
  at.token, 
  at.expires_at, 
  at.is_active,
  at.expires_at > now() as not_expired
FROM professionals p 
LEFT JOIN auth_tokens at ON at.professional_id = p.id 
WHERE p.id = 'cce2c316-9fb2-4fa6-88a5-38f9bb46a382';