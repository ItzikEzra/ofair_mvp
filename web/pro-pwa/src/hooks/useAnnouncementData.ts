import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Announcement } from "@/types/announcements";
import { useProfessionalId } from "./useProfessionalId";
import { getAuthToken } from "@/utils/storageUtils";

interface UseAnnouncementDataProps {
  requestBody: any;
  filteringMode: string;
  category?: string;
}

export const useAnnouncementData = ({ requestBody, filteringMode, category }: UseAnnouncementDataProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { professionalId, isLoading: isProfessionalLoading } = useProfessionalId();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Don't fetch data until we have the professional ID loaded
        if (isProfessionalLoading) {
          console.log("⏳ Waiting for professional ID to load...");
          return;
        }

        setIsLoading(true);
        setError("");

        const finalRequestBody = {
          ...requestBody,
          category: category || ""
        };

        // Debug: log the request body being sent to Edge Functions
        if (finalRequestBody.filteringMode === "city_distance" || finalRequestBody.filteringMode === "city_distance_coords") {
          console.log("📡 Sending to Edge Functions:", {
            filteringMode: finalRequestBody.filteringMode,
            city: finalRequestBody.city,
            distance: finalRequestBody.distance,
            latitude: finalRequestBody.latitude,
            longitude: finalRequestBody.longitude,
            hasCoordinates: !!(finalRequestBody.latitude && finalRequestBody.longitude)
          });
        }

        // Make parallel calls to both Edge Functions
        const [leadsResponse, requestsResponse] = await Promise.all([
          supabase.functions.invoke('get-active-leads', {
            body: finalRequestBody
          }),
          supabase.functions.invoke('get-active-requests', {
            body: finalRequestBody
          })
        ]);

        // Check for errors
        if (leadsResponse.error) {
          console.error("Error fetching leads:", leadsResponse.error);
          throw new Error(`שגיאה בטעינת לידים: ${leadsResponse.error.message}`);
        }

        if (requestsResponse.error) {
          console.error("Error fetching requests:", requestsResponse.error);
          throw new Error(`שגיאה בטעינת בקשות: ${requestsResponse.error.message}`);
        }

        const leads = leadsResponse.data || [];
        const requests = requestsResponse.data || [];

        // Filter out own leads and leads already submitted proposals to
        let filteredLeads = leads;
        let filteredRequests = requests;
        let submittedLeadIds: string[] = [];
        let submittedRequestIds: string[] = [];
        
        if (professionalId) {
          // Get both proposals and quotes I already submitted
          try {
            const authToken = getAuthToken();
            const [proposalsResponse, quotesResponse] = await Promise.all([
              supabase.rpc('get_proposals_secure', {
                token_param: authToken || null
              }),
              supabase.rpc('get_quotes_secure', {
                token_param: authToken || null
              })
            ]);
            
            if (proposalsResponse.data) {
              submittedLeadIds = (proposalsResponse.data as any[])
                .filter((p: any) => p.professional_id === professionalId)
                .map((p: any) => p.lead_id)
                .filter(Boolean);
              
              console.log(`📝 Found ${submittedLeadIds.length} leads I already submitted proposals to`);
            }

            if (quotesResponse.data) {
              submittedRequestIds = (quotesResponse.data as any[])
                .filter((q: any) => q.professional_id === professionalId)
                .map((q: any) => q.request_id)
                .filter(Boolean);
              
              console.log(`📝 Found ${submittedRequestIds.length} requests I already submitted quotes to`);
            }
          } catch (error) {
            console.error("Error fetching submitted proposals/quotes:", error);
          }
          
          filteredLeads = leads.filter((lead: any) => {
            const isOwnLead = lead.professional_id === professionalId;
            const alreadySubmitted = submittedLeadIds.includes(lead.id);
            
            if (isOwnLead) {
              console.log(`🚫 Filtered out own lead: ${lead.title} (ID: ${lead.id})`);
            }
            if (alreadySubmitted) {
              console.log(`✅ Filtered out lead with existing proposal: ${lead.title} (ID: ${lead.id})`);
            }
            
            return !isOwnLead && !alreadySubmitted;
          });

          filteredRequests = requests.filter((request: any) => {
            const alreadySubmitted = submittedRequestIds.includes(request.id);
            
            if (alreadySubmitted) {
              console.log(`✅ Filtered out request with existing quote: ${request.title} (ID: ${request.id})`);
            }
            
            return !alreadySubmitted;
          });

          console.log(`✅ Professional ID loaded: ${professionalId}`);
          console.log(`📊 Filtered ${leads.length - filteredLeads.length} leads out of ${leads.length} total (own + submitted)`);
          console.log(`📊 Filtered ${requests.length - filteredRequests.length} requests out of ${requests.length} total (submitted)`);
        } else {
          console.log("⚠️ No professional ID - showing all announcements (this should rarely happen)");
        }

        // Transform leads to announcements (only other professionals' leads)
        const leadAnnouncements: Announcement[] = filteredLeads.map((lead: any) => ({
          id: lead.id,
          title: lead.title,
          description: lead.description,
          location: lead.location,
          budget: lead.budget,
          created_at: lead.created_at,
          createdAt: lead.created_at,
          type: 'lead' as const,
          share_percentage: lead.share_percentage,
          sharePercentage: lead.share_percentage,
          image_url: lead.image_url,
          image_urls: Array.isArray(lead.image_urls) ? lead.image_urls : (lead.image_urls ? [lead.image_urls] : []),
          professional_id: lead.professional_id,
          distance: lead.distance,
          workDate: lead.work_date,
          workTime: lead.work_time,
          constraints: lead.constraints || lead.notes,
          timing: lead.work_date && lead.work_time 
            ? `${new Date(lead.work_date).toLocaleDateString('he-IL')} בשעה ${lead.work_time}`
            : lead.work_date 
              ? new Date(lead.work_date).toLocaleDateString('he-IL')
              : lead.work_time
                ? `בשעה ${lead.work_time}`
                : undefined,
          clientName: lead.client_name,
          client_name: lead.client_name,
          clientPhone: lead.client_phone,
          client_phone: lead.client_phone,
          clientAddress: lead.client_address,
          client_address: lead.client_address,
          work_date: lead.work_date,
          work_time: lead.work_time
        }));

        // Transform requests to announcements
        const requestAnnouncements: Announcement[] = filteredRequests.map((request: any) => ({
          id: request.id,
          title: request.title,
          description: request.description,
          location: request.location,
          created_at: request.created_at,
          createdAt: request.created_at,
          type: 'request' as const,
          media_urls: Array.isArray(request.media_urls) ? request.media_urls : (request.media_urls ? [request.media_urls] : []),
          distance: request.distance,
          workDate: request.work_date,
          workTime: request.work_time,
          constraints: request.constraints,
          timing: request.timing
        }));

        // Combine and sort
        const allAnnouncements = [...leadAnnouncements, ...requestAnnouncements];

        // Sort: distance first (for distance filtering), then by date
        allAnnouncements.sort((a, b) => {
          if (filteringMode === "city_distance" || filteringMode === "city_distance_coords") {
            // For distance filtering, sort by distance first
            if (a.distance !== undefined && b.distance !== undefined) {
              return a.distance - b.distance;
            }
            if (a.distance !== undefined && b.distance === undefined) {
              return -1;
            }
            if (a.distance === undefined && b.distance !== undefined) {
              return 1;
            }
          }
          
          // Default sort by date
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        console.log(`✅ Final announcements count: ${allAnnouncements.length} (${leadAnnouncements.length} leads + ${requestAnnouncements.length} requests)`);
        setAnnouncements(allAnnouncements);
      } catch (err) {
        console.error("Error fetching announcements:", err);
        setError(err instanceof Error ? err.message : "שגיאה בטעינת מודעות");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [JSON.stringify(requestBody), filteringMode, category, professionalId, isProfessionalLoading]);

  // Listen for proposal submissions to update the announcements efficiently
  useEffect(() => {
    const handleProposalSubmitted = (event: any) => {
      console.log("🔄 Proposal submitted, updating announcements...");
      const { announcementId, announcementType } = event.detail || {};
      
      if (announcementId) {
        // Remove the announcement immediately without full refresh
        setAnnouncements(prev => prev.filter(announcement => 
          announcement.id !== announcementId
        ));
        console.log(`✅ Removed ${announcementType} announcement ${announcementId} from list`);
      }
    };

    window.addEventListener('proposalSubmitted', handleProposalSubmitted);
    return () => {
      window.removeEventListener('proposalSubmitted', handleProposalSubmitted);
    };
  }, []);

  // Keep loading state true until both professional ID and announcements are loaded
  const finalIsLoading = isProfessionalLoading || isLoading;

  return { announcements, isLoading: finalIsLoading, error };
};
