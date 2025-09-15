import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  console.log('[submit-lead-proposal] Function invoked');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const {
      lead_id,
      professional_name,
      professional_phone,
      profession,
      description,
      price,
      estimated_completion,
      lower_price_willing,
      lower_price_value,
      media_urls
    } = await req.json();

    if (!lead_id || !professional_name || !professional_phone || !profession || !description || !price) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[submit-lead-proposal] Processing lead proposal submission');

    // Check if professional already exists
    let professionalId: string;
    
    const { data: existingProfessional, error: checkError } = await supabase
      .from('professionals')
      .select('id')
      .eq('phone_number', professional_phone)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[submit-lead-proposal] Error checking existing professional:', checkError);
      throw new Error('Error checking professional');
    }

    if (existingProfessional) {
      professionalId = existingProfessional.id;
      console.log('[submit-lead-proposal] Using existing professional:', professionalId);
    } else {
      // Create new professional
      const { data: newProfessional, error: createError } = await supabase
        .from('professionals')
        .insert({
          name: professional_name,
          phone_number: professional_phone,
          profession: profession,
          location: 'לא צוין' // Required field with default value
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[submit-lead-proposal] Error creating professional:', createError);
        throw new Error('Error creating professional');
      }

      professionalId = newProfessional.id;
      console.log('[submit-lead-proposal] Created new professional:', professionalId);
    }

    // Create proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        lead_id: lead_id,
        professional_id: professionalId,
        description: description,
        price: price,
        estimated_completion: estimated_completion,
        lower_price_willing: lower_price_willing || false,
        lower_price_value: lower_price_value,
        media_urls: media_urls || [],
        status: 'pending'
      })
      .select('id')
      .single();

    if (proposalError) {
      console.error('[submit-lead-proposal] Error creating proposal:', proposalError);
      throw new Error('Error creating proposal');
    }

    console.log('[submit-lead-proposal] Proposal created successfully:', proposal.id);

    return new Response(JSON.stringify({ 
      success: true, 
      proposal_id: proposal.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[submit-lead-proposal] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});