
import { supabase } from "@/integrations/supabase/client";
import { Request } from "@/types/announcements";

export async function fetchRequests(status: 'active' | 'completed' | 'all' = 'active'): Promise<Request[]> {
  try {
    console.log("Fetching requests with status:", status);
    
    let query = supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
      
    // Filter by status if not fetching all
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error("Error fetching requests:", error);
      throw error;
    }
    
    console.log("Successfully fetched requests:", data?.length || 0);
    return data as Request[];
  } catch (err) {
    console.error("Unexpected error fetching requests:", err);
    throw err;
  }
}

// Add function to cancel request
export async function cancelRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (error) {
      console.error("Error cancelling request:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error cancelling request:", err);
    return false;
  }
}

// Add function to complete request
export async function completeRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('requests')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (error) {
      console.error("Error completing request:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error completing request:", err);
    return false;
  }
}

// Submit a new request by consumer
export async function submitRequest(
  title: string,
  description: string,
  location: string,
  timing: string,
  userId: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('requests')
      .insert({
        title,
        description,
        location,
        timing,
        user_id: userId,
        status: 'active',
        date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error submitting request:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    return { 
      success: true, 
      requestId: data.id 
    };
  } catch (err: any) {
    console.error("Unexpected error submitting request:", err);
    return { 
      success: false, 
      error: err.message || "Unknown error" 
    };
  }
}
