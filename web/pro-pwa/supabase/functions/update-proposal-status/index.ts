
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
    console.log('update-proposal-status function called');
    
    // Use service role key to bypass RLS for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { proposalId, status, proposalType, scheduledDate, scheduledTime } = await req.json();
    
    console.log('Request data:', { proposalId, status, proposalType, scheduledDate, scheduledTime });

    if (!proposalId || !status) {
      console.error('Missing required fields:', { proposalId, status });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: proposalId and status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which table to update based on proposalType
    const isQuote = proposalType === 'quote' || proposalType === 'request';
    const tableName = isQuote ? 'quotes' : 'proposals';
    
    console.log(`Updating ${tableName} table with status: ${status}`);
    
    // Build update data
    const updateData: any = { status: status };
    if (scheduledDate) updateData.scheduled_date = scheduledDate;
    if (scheduledTime) updateData.scheduled_time = scheduledTime;

    // Define the select fields based on table type
    const selectFields = isQuote 
      ? 'id, professional_id, request_id'
      : 'id, professional_id, lead_id';

    // First check if the record exists
    const { data: existingRecord, error: checkError } = await supabaseClient
      .from(tableName)
      .select(selectFields)
      .eq('id', proposalId)
      .single();

    if (checkError || !existingRecord) {
      console.error(`${tableName} not found:`, checkError);
      return new Response(
        JSON.stringify({ 
          error: `${tableName} not found`,
          details: checkError?.message || 'Record does not exist'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found existing ${tableName}:`, existingRecord);

    // Special handling for accepting proposals - reject other proposals for the same lead
    if (status === 'accepted' && !isQuote && existingRecord.lead_id) {
      console.log('Accepting proposal - checking for other proposals to reject');
      
      // Check if there's already an accepted proposal for this lead
      const { data: existingAcceptedProposal, error: acceptedCheckError } = await supabaseClient
        .from('proposals')
        .select('id, professional_id')
        .eq('lead_id', existingRecord.lead_id)
        .eq('status', 'accepted')
        .neq('id', proposalId)
        .limit(1);

      if (acceptedCheckError) {
        console.error('Error checking for existing accepted proposal:', acceptedCheckError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to check existing proposals',
            details: acceptedCheckError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingAcceptedProposal && existingAcceptedProposal.length > 0) {
        console.log('Found existing accepted proposal:', existingAcceptedProposal[0]);
        return new Response(
          JSON.stringify({ 
            error: 'Another proposal has already been accepted for this lead',
            details: 'Only one proposal can be accepted per lead'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First, get all other pending proposals for this lead to notify them
      const { data: otherProposals, error: getOthersError } = await supabaseClient
        .from('proposals')
        .select('id, professional_id')
        .eq('lead_id', existingRecord.lead_id)
        .eq('status', 'pending')
        .neq('id', proposalId);

      if (getOthersError) {
        console.error('Error getting other proposals:', getOthersError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to get other proposals',
            details: getOthersError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reject all other pending proposals for this lead
      const { error: rejectOthersError } = await supabaseClient
        .from('proposals')
        .update({ status: 'rejected' })
        .eq('lead_id', existingRecord.lead_id)
        .eq('status', 'pending')
        .neq('id', proposalId);

      if (rejectOthersError) {
        console.error('Error rejecting other proposals:', rejectOthersError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to reject other proposals',
            details: rejectOthersError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully rejected other proposals for lead:', existingRecord.lead_id);

      // Create notifications for rejected professionals
      if (otherProposals && otherProposals.length > 0) {
        try {
          console.log('Creating rejection notifications for other professionals');
          
          // Get lead details for notifications
          const { data: lead } = await supabaseClient
            .from('leads')
            .select('title, location')
            .eq('id', existingRecord.lead_id)
            .single();

          if (lead) {
            // Create notifications for all rejected professionals
            const rejectionNotifications = otherProposals.map(proposal => ({
              professional_id: proposal.professional_id,
              title: 'הצעת המחיר שלך נדחתה',
              description: `הצעת המחיר שלך עבור "${lead.title}" נדחתה מכיוון שהצעה אחרת אושרה.`,
              type: 'proposal_rejected',
              related_id: proposal.id,
              related_type: 'proposal'
            }));

            const { error: notificationError } = await supabaseClient
              .from('notifications')
              .insert(rejectionNotifications);

            if (notificationError) {
              console.error('Error creating rejection notifications:', notificationError);
            } else {
              console.log(`Created ${rejectionNotifications.length} rejection notifications`);
            }
          }
        } catch (notificationError) {
          console.error('Error in rejection notification process:', notificationError);
          // Don't fail the main operation if notification fails
        }
      }
    }

    // Update the proposal/quote status
    const { data: updatedRecord, error: updateError } = await supabaseClient
      .from(tableName)
      .update(updateData)
      .eq('id', proposalId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update proposal status',
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated proposal:', updatedRecord);

    // If status is 'accepted' and it's a lead proposal, update the lead status to 'approved'
    if (status === 'accepted' && !isQuote && updatedRecord.lead_id) {
      try {
        console.log('Updating lead status to approved for lead ID:', updatedRecord.lead_id);
        
        const { error: leadUpdateError } = await supabaseClient
          .from('leads')
          .update({ 
            status: 'approved'
          })
          .eq('id', updatedRecord.lead_id);

        if (leadUpdateError) {
          console.error('Error updating lead status:', leadUpdateError);
          // Don't fail the main operation if lead update fails
        } else {
          console.log('Successfully updated lead status to approved');
        }
      } catch (leadError) {
        console.error('Error in lead status update process:', leadError);
        // Don't fail the main operation if lead update fails
      }
    }

    // If status is 'accepted' or 'rejected', create notification and get professional details
    if (status === 'accepted' || status === 'rejected') {
      try {
        console.log(`Creating notification for ${status} proposal`);
        
        // Get professional details
        const professionalId = updatedRecord.professional_id;
        
        if (professionalId) {
          const { data: professional } = await supabaseClient
            .from('professionals')
            .select('name, phone_number')
            .eq('id', professionalId)
            .single();

          console.log('Professional data:', professional);

          // Get lead/request details for notification
          let targetDetails = null;
          if (isQuote && updatedRecord.request_id) {
            const { data: request } = await supabaseClient
              .from('requests')
              .select('title, location, user_id')
              .eq('id', updatedRecord.request_id)
              .single();
            targetDetails = request;
            console.log('Request details:', targetDetails);
          } else if (!isQuote && updatedRecord.lead_id) {
            const { data: lead } = await supabaseClient
              .from('leads')
              .select('title, location, professional_id, client_name, client_phone, client_address')
              .eq('id', updatedRecord.lead_id)
              .single();
            targetDetails = lead;
            console.log('Lead details:', targetDetails);
          }

          if (targetDetails && professional) {
            // Create notification for professional
            const isAccepted = status === 'accepted';
            const notificationData = {
              professional_id: professionalId,
              title: isAccepted ? `הצעת המחיר שלך אושרה!` : `הצעת המחיר שלך נדחתה`,
              description: isAccepted 
                ? `הצעת המחיר שלך עבור "${targetDetails.title}" אושרה.`
                : `הצעת המחיר שלך עבור "${targetDetails.title}" נדחתה.`,
              type: isAccepted ? 'proposal_approved' : 'proposal_rejected',
              related_id: proposalId,
              related_type: isQuote ? 'quote' : 'proposal',
              client_details: (isQuote || !isAccepted) ? null : {
                name: targetDetails.client_name,
                phone: targetDetails.client_phone,
                address: targetDetails.client_address
              }
            };

            console.log('Creating notification:', notificationData);

            const { error: notificationError } = await supabaseClient
              .from('notifications')
              .insert(notificationData);

            if (notificationError) {
              console.error('Error creating notification:', notificationError);
            } else {
              console.log('Notification created successfully for professional:', professionalId);
            }
          }
        }
      } catch (notificationError) {
        console.error('Error in notification creation process:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${isQuote ? 'Quote' : 'Proposal'} status updated successfully`,
        data: updatedRecord,
        rejectedOthers: status === 'accepted' && !isQuote
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-proposal-status function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
