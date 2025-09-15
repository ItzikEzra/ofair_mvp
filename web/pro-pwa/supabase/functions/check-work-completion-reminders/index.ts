
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // חיפוש עבודות שהסתיימו לפני 3 שעות ועדיין לא נשלח להם טופס השלמה
    const threeHoursAgo = new Date();
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

    const { data: pendingReminders, error } = await supabase
      .from('work_completion_reminders')
      .select(`
        *,
        proposals!inner(
          id,
          professional_id,
          lead_id,
          leads!inner(title)
        ),
        quotes!inner(
          id,
          professional_id,
          request_id,
          requests!inner(title)
        )
      `)
      .lte('scheduled_work_time', threeHoursAgo.toISOString())
      .eq('completion_form_sent', false);

    if (error) {
      console.error('Error fetching pending reminders:', error);
      throw error;
    }

    console.log(`Found ${pendingReminders?.length || 0} pending work completion reminders`);

    // עיבוד כל תזכורת
    for (const reminder of pendingReminders || []) {
      try {
        let professionalId: string;
        let workTitle: string;
        
        if (reminder.proposal_type === 'proposal' && reminder.proposals) {
          professionalId = reminder.proposals.professional_id;
          workTitle = reminder.proposals.leads?.title || 'עבודה לא ידועה';
        } else if (reminder.proposal_type === 'quote' && reminder.quotes) {
          professionalId = reminder.quotes.professional_id;
          workTitle = reminder.quotes.requests?.title || 'בקשה לא ידועה';
        } else {
          console.log(`Skipping reminder ${reminder.id} - missing data`);
          continue;
        }

        // יצירת התראה
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            professional_id: professionalId,
            title: 'זמן למלא טופס השלמת עבודה',
            description: `העבודה "${workTitle}" הסתיימה. אנא מלא את טופס השלמת העבודה כדי לקבל את התשלום.`,
            type: 'work_completion_reminder',
            related_id: reminder.proposal_id,
            related_type: reminder.proposal_type
          });

        if (notificationError) {
          console.error(`Error creating notification for reminder ${reminder.id}:`, notificationError);
          continue;
        }

        // עדכון שהתזכורת נשלחה
        const { error: updateError } = await supabase
          .from('work_completion_reminders')
          .update({ 
            completion_form_sent: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`Error updating reminder ${reminder.id}:`, updateError);
        } else {
          console.log(`Successfully sent work completion reminder for ${reminder.id}`);
        }

      } catch (reminderError) {
        console.error(`Error processing reminder ${reminder.id}:`, reminderError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pendingReminders?.length || 0,
        message: `Processed ${pendingReminders?.length || 0} work completion reminders`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in check-work-completion-reminders:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
