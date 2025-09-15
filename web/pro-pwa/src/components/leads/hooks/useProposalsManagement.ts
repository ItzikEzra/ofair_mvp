
import { useState, useEffect, useMemo } from "react";
import { useLeadProposals } from "@/hooks/useLeadProposals";
import { acceptProposal, rejectProposal } from "@/services/proposalService";
import { useToast } from "@/hooks/use-toast";

interface UseProposalsManagementProps {
  leadId: string;
  sharePercentage: number;
}

export const useProposalsManagement = (leadId: string, sharePercentage: number) => {
  const { proposals, isLoading, refreshProposals } = useLeadProposals(leadId);
  const [updatingProposalId, setUpdatingProposalId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating_high' | 'rating_low'>('newest');
  const { toast } = useToast();

  const calculateEarnings = (price: number | null) => {
    if (!price) {
      return {
        totalPrice: 0,
        leadCommission: 0,
        oFairCommission: 0,
        finalAmount: 0
      };
    }
    
    const totalPrice = price;
    const leadCommission = (totalPrice * sharePercentage) / 100;
    const oFairCommission = totalPrice * 0.05; // 5% oFair commission
    const finalAmount = totalPrice - oFairCommission;
    
    return {
      totalPrice,
      leadCommission,
      oFairCommission,
      finalAmount
    };
  };

  const sortedProposals = useMemo(() => {
    if (!proposals || proposals.length === 0) return [];
    
    const sorted = [...proposals];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'price_low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price_high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'rating_high':
        return sorted.sort((a, b) => {
          const ratingA = a.professionals?.rating || 0;
          const ratingB = b.professionals?.rating || 0;
          return ratingB - ratingA;
        });
      case 'rating_low':
        return sorted.sort((a, b) => {
          const ratingA = a.professionals?.rating || 0;
          const ratingB = b.professionals?.rating || 0;
          return ratingA - ratingB;
        });
      default:
        return sorted;
    }
  }, [proposals, sortBy]);

  const handleUpdateProposalStatus = async (proposalId: string, newStatus: string) => {
    setUpdatingProposalId(proposalId);
    
    try {
      if (newStatus === 'accepted') {
        const result = await acceptProposal(proposalId, 'proposal');
        
        if (result.success) {
          toast({
            title: "הצעת המחיר אושרה בהצלחה",
            description: result.rejectedOthers 
              ? "הצעות המחיר האחרות נדחו אוטומטית"
              : "הצעת המחיר אושרה",
          });
        } else {
          toast({
            title: "שגיאה באישור הצעת המחיר",
            description: result.error || "אירעה שגיאה בעת אישור ההצעה",
            variant: "destructive",
          });
        }
      } else if (newStatus === 'rejected') {
        const success = await rejectProposal(proposalId, 'proposal');
        
        if (success) {
          toast({
            title: "הצעת המחיר נדחתה",
            description: "הצעת המחיר נדחתה בהצלחה",
          });
        } else {
          toast({
            title: "שגיאה בדחיית הצעת המחיר",
            description: "אירעה שגיאה בעת דחיית ההצעה",
            variant: "destructive",
          });
        }
      }
      
      // Refresh proposals to show updated status
      await refreshProposals();
      
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת עדכון סטטוס ההצעה",
        variant: "destructive",
      });
    } finally {
      setUpdatingProposalId(null);
    }
  };

  return {
    sortedProposals,
    isLoading,
    updatingProposalId,
    sortBy,
    setSortBy,
    handleUpdateProposalStatus,
    calculateEarnings,
    refreshProposals
  };
};
