
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key without user authorization to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      professionalId,
      announcementId,
      announcementType,
      price,
      description,
      estimatedCompletion,
      media_urls,
      lowerPriceOption,
      wantToSuggestPrice
    } = await req.json();

    console.log('Submitting proposal:', {
      professionalId,
      announcementId,
      announcementType,
      price,
      description,
      estimatedCompletion,
      hasMediaUrls: !!media_urls,
      lowerPriceOption,
      wantToSuggestPrice
    });

    if (!professionalId || !announcementId || !announcementType) {
      console.error('Missing required fields:', { professionalId, announcementId, announcementType });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    if (announcementType === 'lead') {
      // Check if proposal already exists for this lead and professional
      const { data: existingProposal } = await supabaseClient
        .from('proposals')
        .select('id')
        .eq('professional_id', professionalId)
        .eq('lead_id', announcementId)
        .single();

      if (existingProposal) {
        console.log('Proposal already exists for this lead and professional');
        return new Response(
          JSON.stringify({ error: 'הצעה כבר קיימת עבור מודעה זו' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle lead proposal
      const proposalData: any = {
        professional_id: professionalId,
        lead_id: announcementId,
        price: price ? parseFloat(price) : null,
        description: description || '',
        estimated_completion: estimatedCompletion || null,
        media_urls: media_urls || null,
        status: 'pending'
      };

      // Add lower price option if provided
      if (lowerPriceOption?.willing && lowerPriceOption?.price) {
        proposalData.lower_price_willing = true;
        proposalData.lower_price_value = parseFloat(lowerPriceOption.price);
      }

      console.log('Inserting proposal data:', proposalData);

      const { data, error } = await supabaseClient
        .from('proposals')
        .insert(proposalData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting proposal:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to submit proposal: ' + error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = data;
      console.log('Proposal inserted successfully:', result);

      // Get lead details for notification - WITHOUT PROFESSIONAL NAME
      const { data: lead } = await supabaseClient
        .from('leads')
        .select('title, professional_id')
        .eq('id', announcementId)
        .single();

      // Create notification without professional name
      if (lead?.professional_id) {
        try {
          console.log('Creating notification for lead proposal without professional name');
          
          const notificationData = {
            professional_id: lead.professional_id,
            title: 'הצעת מחיר חדשה התקבלה',
            description: `קיבלת הצעת מחיר חדשה עבור הליד "${lead.title}"`,
            type: 'new_proposal',
            related_id: result.id,
            related_type: 'proposal'
          };

          console.log('Creating notification:', notificationData);

          const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert(notificationData);

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
          } else {
            console.log('Notification created successfully for professional:', lead.professional_id);
          }
        } catch (notificationError) {
          console.error('Error in notification creation process:', notificationError);
        }
      }

    } else if (announcementType === 'request') {
      // Check if quote already exists for this request and professional
      const { data: existingQuote } = await supabaseClient
        .from('quotes')
        .select('id')
        .eq('professional_id', professionalId)
        .eq('request_id', announcementId)
        .single();

      if (existingQuote) {
        console.log('Quote already exists for this request and professional');
        return new Response(
          JSON.stringify({ error: 'הצעה כבר קיימת עבור בקשה זו' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle request quote
      const quoteData: any = {
        professional_id: professionalId,
        request_id: announcementId,
        price: price || '',
        description: description || '',
        estimated_time: estimatedCompletion || null,
        media_urls: media_urls || null,
        status: 'pending'
      };

      console.log('Inserting quote data:', quoteData);

      const { data, error } = await supabaseClient
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting quote:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to submit quote: ' + error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = data;
      console.log('Quote inserted successfully:', result);

      // Get request details for notification - WITHOUT PROFESSIONAL NAME
      const { data: request } = await supabaseClient
        .from('requests')
        .select('title, user_id')
        .eq('id', announcementId)
        .single();

      if (request?.user_id) {
        // For consumer requests, we need to find the professional_id of the consumer
        const { data: consumerProfessional } = await supabaseClient
          .from('professionals')
          .select('id')
          .eq('user_id', request.user_id)
          .single();

        if (consumerProfessional) {
          try {
            const notificationData = {
              professional_id: consumerProfessional.id,
              title: 'הצעת מחיר חדשה התקבלה',
              description: `קיבלת הצעת מחיר חדשה עבור הבקשה "${request.title}"`,
              type: 'new_quote',
              related_id: result.id,
              related_type: 'quote'
            };

            const { error: notificationError } = await supabaseClient
              .from('notifications')
              .insert(notificationData);

            if (notificationError) {
              console.error('Error creating notification:', notificationError);
            } else {
              console.log('Notification created successfully for consumer:', consumerProfessional.id);
            }
          } catch (notificationError) {
            console.error('Error in notification creation process:', notificationError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-proposal function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
