
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Announcement } from "@/types/announcements";
import { useProfessionalId } from "./useProfessionalId";

interface UseAnnouncementsProps {
  filters: {
    city: string;
    distance: string;
    category: string;
    areaRestriction?: string[];
  };
}

export const useAnnouncements = ({ filters }: UseAnnouncementsProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { professionalId } = useProfessionalId();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true);
        setError("");

        console.log("Fetching announcements with filters:", filters);

        // Prepare filter data for the edge functions
        const filterData = {
          city: filters.city || "",
          distance: filters.distance || "",
          category: filters.category || "",
          areaRestriction: filters.areaRestriction || []
        };

        // Fetch leads
        const leadsResponse = await supabase.functions.invoke('get-active-leads', {
          body: { filters: filterData }
        });

        if (leadsResponse.error) {
          console.error("Error fetching leads:", leadsResponse.error);
          throw new Error(`שגיאה בטעינת לידים: ${leadsResponse.error.message}`);
        }

        // Fetch requests
        const requestsResponse = await supabase.functions.invoke('get-active-requests', {
          body: { filters: filterData }
        });

        if (requestsResponse.error) {
          console.error("Error fetching requests:", requestsResponse.error);
          throw new Error(`שגיאה בטעינת בקשות: ${requestsResponse.error.message}`);
        }

        const leads = leadsResponse.data || [];
        const requests = requestsResponse.data || [];

        console.log(`Fetched ${leads.length} leads and ${requests.length} requests`);

        // Filter out leads that belong to the current professional
        const filteredLeads = leads.filter((lead: any) => lead.professional_id !== professionalId);
        console.log(`After filtering out own leads: ${filteredLeads.length} leads remaining`);

        // Transform leads to announcements with FIXED data mapping (only other professionals' leads)
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
          image_urls: lead.image_urls,
          professional_id: lead.professional_id,
          distance: lead.distance,
          // CRITICAL FIX: Map work schedule and constraints properly
          workDate: lead.work_date,
          workTime: lead.work_time,
          constraints: lead.constraints || lead.notes, // Map both constraints and notes
          timing: lead.work_date && lead.work_time 
            ? `${new Date(lead.work_date).toLocaleDateString('he-IL')} בשעה ${lead.work_time}`
            : lead.work_date 
              ? new Date(lead.work_date).toLocaleDateString('he-IL')
              : lead.work_time
                ? `בשעה ${lead.work_time}`
                : undefined
        }));

        // Transform requests to announcements with FIXED data mapping
        const requestAnnouncements: Announcement[] = requests.map((request: any) => ({
          id: request.id,
          title: request.title,
          description: request.description,
          location: request.location,
          created_at: request.created_at,
          createdAt: request.created_at,
          type: 'request' as const,
          media_urls: request.media_urls,
          // Map any additional fields for requests
          workDate: request.work_date,
          workTime: request.work_time,
          constraints: request.constraints,
          timing: request.timing
        }));

        // Combine and sort by creation date
        const allAnnouncements = [...leadAnnouncements, ...requestAnnouncements];
        allAnnouncements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        console.log("Final announcements with mapped data:", allAnnouncements);
        setAnnouncements(allAnnouncements);
      } catch (err) {
        console.error("Error in useAnnouncements:", err);
        setError(err instanceof Error ? err.message : "שגיאה בטעינת מודעות");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [filters.city, filters.distance, filters.category, JSON.stringify(filters.areaRestriction), professionalId]);

  return { announcements, isLoading, error };
};
