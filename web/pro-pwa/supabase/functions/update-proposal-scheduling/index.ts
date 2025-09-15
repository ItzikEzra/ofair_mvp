
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { proposalId, proposalType, workDate, workTime, complete, paymentDetails } = await req.json();
    
    if (!proposalId || !proposalType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server configuration error: Missing Supabase URL or key");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Determine if this is a lead proposal or a quote (request)
    const tableName = proposalType === 'proposal' ? 'proposals' : 'quotes';
    
    // If this is just scheduling (not completion)
    if (workDate && !complete) {
      // Update proposal/quote with scheduling details
      const { data: updatedData, error: updateError } = await supabase
        .from(tableName)
        .update({ 
          scheduled_date: workDate, 
          scheduled_time: workTime || null,
          status: 'scheduled'
        })
        .eq('id', proposalId)
        .select()
        .single();
        
      if (updateError) {
        console.error(`Error updating ${proposalType}:`, updateError);
        throw updateError;
      }
      
      // Update the reminder status to scheduled
      const { error: reminderUpdateError } = await supabase
        .from('proposal_reminders')
        .update({ is_scheduled: true })
        .eq('proposal_id', proposalId)
        .eq('proposal_type', proposalType);
        
      if (reminderUpdateError) {
        console.error("Error updating reminder status:", reminderUpdateError);
        // Continue anyway - the proposal/quote was updated successfully
      }
      
      // Add project if it doesn't exist yet
      try {
        const relatedIdField = proposalType === 'proposal' ? 'lead_id' : 'request_id';
        
        // Check if project already exists for this proposal/quote
        const { data: existingProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('professional_id', updatedData.professional_id)
          .eq(`${proposalType}_id`, proposalId);
          
        if (!existingProjects || existingProjects.length === 0) {
          // Get title from lead or request
          let title = "";
          let clientName = "";
          
          if (proposalType === 'proposal') {
            const { data: leadData } = await supabase
              .from('leads')
              .select('title, client_name')
              .eq('id', updatedData.lead_id)
              .single();
              
            if (leadData) {
              title = leadData.title;
              clientName = leadData.client_name || "לקוח";
            }
          } else {
            const { data: requestData } = await supabase
              .from('requests')
              .select('title')
              .eq('id', updatedData.request_id)
              .single();
              
            if (requestData) {
              title = requestData.title;
              clientName = "לקוח ישיר";
            }
          }
          
          // Create a new project
          await supabase.from('projects').insert({
            professional_id: updatedData.professional_id,
            title: title || `עבודה מתוזמנת`,
            client: clientName,
            price: updatedData.price,
            start_date: workDate,
            end_date: null,
            status: 'scheduled',
            progress: 0,
            [`${proposalType}_id`]: proposalId
          });
        }
      } catch (err) {
        console.error("Error creating project:", err);
        // Continue anyway - this is just a bonus feature
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          scheduledDate: workDate,
          scheduledTime: workTime || null
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        scheduledDate: workDate,
        scheduledTime: workTime || null
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error updating scheduling:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
