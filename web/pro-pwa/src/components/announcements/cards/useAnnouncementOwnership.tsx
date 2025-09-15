
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAnnouncementOwnership = (announcementId: string, announcementType: 'lead' | 'request') => {
  const [isOwner, setIsOwner] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOwnership = async () => {
      if (announcementType !== 'lead') {
        setIsChecking(false);
        return;
      }
      
      try {
        // Get stored professional ID
        const storedProfessionalId = localStorage.getItem("professionalId");
        
        // Get auth session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !storedProfessionalId) {
          console.log("No session or professional ID available for ownership check");
          setIsChecking(false);
          return;
        }
        
        // Use direct query to check ownership
        if (storedProfessionalId) {
          console.log("Using stored professional ID for ownership check:", storedProfessionalId);
          
          // Direct query to check if the professional owns the lead
          const { data: lead, error } = await supabase
            .from('leads')
            .select('professional_id')
            .eq('id', announcementId as any)
            .maybeSingle();
            
          if (!error && lead && 'professional_id' in lead && lead.professional_id && 
              lead.professional_id.toString() === storedProfessionalId.toString()) {
            console.log("Direct query confirmed ownership");
            setIsOwner(true);
          }
        } else if (session) {
          const userId = session.user.id;
          
          // Use the new professional ownership function
          const { data, error } = await supabase.rpc(
            'check_professional_ownership',
            {
              professional_id_param: announcementId,
              user_id_param: userId
            }
          );
          
          if (error) {
            console.error("Error checking professional ownership:", error);
          } else {
            console.log("Professional ownership check result:", data);
            setIsOwner(Boolean(data));
          }
        }
      } catch (err) {
        console.error("Error checking announcement ownership:", err);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkOwnership();
  }, [announcementId, announcementType]);

  return { isOwner, isChecking };
};
