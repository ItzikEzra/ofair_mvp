export async function validateAuthToken(token: string, supabase: any): Promise<string | null> {
  if (!token) {
    console.log('No token provided to validateAuthToken')
    return null;
  }

  // Do not log token details for security
  console.log('Validating auth token')

  try {
    const { data, error } = await supabase
      .from('auth_tokens')
      .select('professional_id, expires_at')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    // Log only success/failure for security
    console.log('Token lookup completed:', error ? 'failed' : 'success')

    if (error || !data) {
      console.log('Token not found or invalid')
      return null;
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const isExpired = expiresAt < now;
    console.log('Token expiry check:', { isExpired })

    if (isExpired) {
      console.log('Token expired, deactivating')
      // Token expired - deactivate it
      await supabase
        .from('auth_tokens')
        .update({ is_active: false })
        .eq('token', token);
      return null;
    }

    // Update last_used_at
    await supabase
      .from('auth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);

    console.log('Token validation successful for professional:', data.professional_id)
    return data.professional_id;
  } catch (err) {
    console.error('Error in validateAuthToken:', err)
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  return authHeader?.replace('Bearer ', '') || null;
}