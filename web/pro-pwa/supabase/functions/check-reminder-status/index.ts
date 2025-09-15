
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
    const { professionalId } = await req.json();
    
    if (!professionalId) {
      return new Response(
        JSON.stringify({ error: "Missing professional ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get unscheduled reminders with proper joins
    const { data: reminders, error: remindersError } = await supabase
      .from('proposal_reminders')
      .select(`
        id,
        proposal_id,
        proposal_type,
        last_reminder,
        reminder_count,
        is_scheduled,
        created_at
      `)
      .eq('is_scheduled', false)
      .order('last_reminder', { ascending: true });
    
    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({
          hasReminders: false,
          activeReminders: [],
          reminderCount: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter reminders for this professional and get proposal/quote details
    const activeReminders = [];
    
    for (const reminder of reminders) {
      let proposalData = null;
      
      if (reminder.proposal_type === 'proposal') {
        const { data: proposal } = await supabase
          .from('proposals')
          .select('id, description, lead_id, price, created_at, scheduled_date, professional_id')
          .eq('id', reminder.proposal_id)
          .eq('professional_id', professionalId)
          .single();
          
        if (proposal) {
          proposalData = {
            ...proposal,
            type: 'proposal'
          };
        }
      } else if (reminder.proposal_type === 'quote') {
        const { data: quote } = await supabase
          .from('quotes')
          .select('id, description, request_id, price, created_at, scheduled_date, professional_id')
          .eq('id', reminder.proposal_id)
          .eq('professional_id', professionalId)
          .single();
          
        if (quote) {
          proposalData = {
            ...quote,
            type: 'quote'
          };
        }
      }
      
      if (proposalData) {
        activeReminders.push({
          ...reminder,
          proposal: proposalData
        });
      }
    }
    
    // Return data
    return new Response(
      JSON.stringify({
        hasReminders: activeReminders.length > 0,
        activeReminders,
        reminderCount: activeReminders.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking proposal reminders:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
