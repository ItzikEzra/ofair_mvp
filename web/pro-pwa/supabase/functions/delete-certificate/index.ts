import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateAuthToken } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('=== DELETE CERTIFICATE DEBUG ===')
    
    // Extract and validate token for OTP users
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    let professionalId: string | null = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      console.log('Extracted token length:', token.length)
      
      // Try OTP token validation
      try {
        professionalId = await validateAuthToken(token, supabase)
        console.log('OTP validation result:', professionalId)
      } catch (otpError) {
        console.log('OTP validation failed:', otpError)
        
        // Try regular Supabase auth as fallback
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token)
          console.log('Supabase auth result:', { user: !!user, error })
          
          if (!error && user) {
            // Get professional ID from user
            const { data: professional, error: profError } = await supabase
              .from('professionals')
              .select('id')
              .eq('user_id', user.id)
              .single()
            
            console.log('Professional lookup result:', { professional, profError })
            professionalId = professional?.id || null
          }
        } catch (authError) {
          console.log('Supabase auth failed:', authError)
        }
      }
    }

    console.log('Final professional ID:', professionalId)

    if (!professionalId) {
      console.log('No professional ID found, returning 401')
      return new Response(
        JSON.stringify({ 
          error: 'לא ניתן למצוא פרופיל מקצועי. נא להיכנס מחדש למערכת.',
          debug: 'No valid authentication found'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { certificate_id } = await req.json()

    if (!certificate_id) {
      return new Response(
        JSON.stringify({ error: 'מזהה התעודה חסר' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Deleting certificate:', certificate_id, 'for professional:', professionalId)

    // First, get the certificate to verify ownership and get file URL
    const { data: certificate, error: fetchError } = await supabase
      .from('professional_certificates')
      .select('*')
      .eq('id', certificate_id)
      .eq('professional_id', professionalId)
      .single()

    if (fetchError || !certificate) {
      console.error('Certificate not found or unauthorized:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: 'התעודה לא נמצאה או אין הרשאה למחיקה',
          details: fetchError?.message 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('professional_certificates')
      .delete()
      .eq('id', certificate_id)
      .eq('professional_id', professionalId)

    if (deleteError) {
      console.error('Error deleting certificate from database:', deleteError)
      return new Response(
        JSON.stringify({ 
          error: 'שגיאה במחיקת התעודה מהמסד נתונים',
          details: deleteError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to delete file from storage (optional - don't fail if this fails)
    try {
      const urlParts = certificate.certificate_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const bucketName = urlParts[urlParts.length - 2] || 'certificates'
      
      await supabase.storage
        .from(bucketName)
        .remove([fileName])
      
      console.log('File deleted from storage successfully')
    } catch (storageError) {
      console.log('Storage deletion failed (non-critical):', storageError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'התעודה נמחקה בהצלחה'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-certificate function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'שגיאה לא צפויה במחיקת התעודה',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})