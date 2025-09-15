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
    
    console.log('=== LIST CERTIFICATES DEBUG ===')
    
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

    console.log('Fetching certificates for professional:', professionalId)

    // Fetch certificates using service role
    const { data: certificates, error } = await supabase
      .from('professional_certificates')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
      return new Response(
        JSON.stringify({ 
          error: 'שגיאה בטעינת התעודות',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Certificates fetched successfully:', certificates?.length || 0)

    return new Response(
      JSON.stringify({ 
        certificates: certificates || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in list-certificates function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'שגיאה לא צפויה בטעינת התעודות',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})