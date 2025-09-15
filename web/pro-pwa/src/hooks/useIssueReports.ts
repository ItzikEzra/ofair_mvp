import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfessionalId } from "@/hooks/useProfessionalId";

export interface IssueReport {
  id: string;
  professional_id: string;
  issue_type: 'app_bug' | 'user_behavior';
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed_by_user';
  admin_response?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIssueReportData {
  issue_type: 'app_bug' | 'user_behavior';
  description: string;
}

export const useIssueReports = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { professionalId } = useProfessionalId();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all issues for the current professional
  const { data: issues, error: fetchError, isLoading: isFetching } = useQuery({
    queryKey: ['issue-reports', professionalId],
    queryFn: async () => {
      if (!professionalId) {
        throw new Error('Professional ID not found');
      }

      console.log("Fetching issue reports via edge function for professional:", professionalId);
      const { data, error } = await supabase.functions.invoke('get-issue-reports', {
        body: { professionalId }
      });
      
      if (error) {
        console.error("Error fetching issue reports:", error);
        throw new Error(error.message || "Failed to fetch issue reports");
      }
      
      return data as IssueReport[];
    },
    enabled: !!professionalId,
  });

  // Create new issue report
  const createIssueMutation = useMutation({
    mutationFn: async (issueData: CreateIssueReportData) => {
      if (!professionalId) {
        throw new Error('Professional ID not found');
      }

      console.log("Creating issue report via edge function for professional:", professionalId);
      const { data, error } = await supabase.functions.invoke('create-issue-report', {
        body: { 
          professionalId,
          issueType: issueData.issue_type,
          description: issueData.description
        }
      });
      
      if (error) {
        console.error("Error creating issue report:", error);
        throw new Error(error.message || "Failed to create issue report");
      }
      
      return data as IssueReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-reports', professionalId] });
      toast({
        title: "הפנייה נשלחה בהצלחה",
        description: "נטפל בפנייתך בהקדם האפשרי",
      });
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Create issue error:', error);
      toast({
        title: "שגיאה בשליחת הפנייה",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const createIssue = (issueData: CreateIssueReportData) => {
    createIssueMutation.mutate(issueData);
  };

  return {
    issues: issues || [],
    isLoading: isLoading || isFetching,
    error: fetchError,
    createIssue,
  };
};