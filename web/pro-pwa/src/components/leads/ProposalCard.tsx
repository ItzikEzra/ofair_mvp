
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon, UserIcon, MapPinIcon, StarIcon, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface Proposal {
  id: string;
  professional_id: string;
  price: number | null;
  description: string;
  status: string;
  created_at: string;
  estimated_completion?: string;
  sample_image_url?: string;
  lower_price_willing?: boolean;
  lower_price_value?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  // Fix: Handle both singular and plural forms
  professional?: {
    name: string;
    phone_number: string;
    location: string;
    profession: string;
    rating?: number;
    review_count?: number;
  };
  professionals?: {
    id: string;
    name: string;
    phone_number: string;
    profession: string;
    location: string;
    rating: number;
    review_count?: number;
  };
}

interface ProposalCardProps {
  proposal: Proposal;
  isOwner: boolean;
  sharePercentage: number;
  isHighlighted: boolean;
  isUpdating: boolean;
  onUpdateStatus: (proposalId: string, status: string) => void;
  calculateEarnings: (price: number | null) => {
    totalPrice: number;
    leadCommission: number;
    oFairCommission: number;
    finalAmount: number;
  };
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  isOwner,
  sharePercentage,
  isHighlighted,
  isUpdating,
  onUpdateStatus,
  calculateEarnings
}) => {
  const earnings = calculateEarnings(proposal.price);

  // Fix: Extract professional data from either format
  const professionalData = proposal.professionals || proposal.professional;
  
  // Calculate net earnings for the professional (after oFair commission)
  const calculateProfessionalNetEarnings = (price: number | null) => {
    if (!price) return 0;
    const oFairCommission = price * 0.05; // 5% oFair commission
    return price - oFairCommission;
  };

  const professionalNetEarnings = calculateProfessionalNetEarnings(proposal.price);

  return (
    <div className={`p-6 border-0 rounded-3xl bg-white/80 backdrop-blur-sm shadow-2xl shadow-blue-500/10 transition-all duration-300 hover:shadow-3xl hover:shadow-blue-500/15 ${isHighlighted ? 'ring-2 ring-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50' : ''}`}>
      {/* Professional Header - Show city and rating */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <UserIcon size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg text-gray-800">מקצועי</span>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-sm">
              {professionalData?.profession}
            </Badge>
          </div>
          
          {/* Professional Details Row - Show city and rating */}
          <div className="flex items-center gap-4 text-sm">
            {professionalData?.location && (
              <div className="flex items-center gap-1 text-blue-600">
                <MapPinIcon size={14} />
                <span className="font-medium">{professionalData.location}</span>
              </div>
            )}
            
            {/* Rating Display - Show for all professionals */}
            {professionalData && (
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full border border-yellow-200">
                <StarIcon size={16} className="text-yellow-600 fill-current" />
                {professionalData.rating && professionalData.rating > 0 ? (
                  <>
                    <span className="font-bold text-yellow-800 text-base">
                      {professionalData.rating.toFixed(1)}
                    </span>
                    {professionalData.review_count && professionalData.review_count > 0 && (
                      <span className="text-xs text-yellow-700">
                        ({professionalData.review_count})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-yellow-700 font-medium">
                    מקצועי חדש
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <Badge variant={proposal.status === 'accepted' ? 'default' : proposal.status === 'rejected' ? 'destructive' : 'secondary'}>
          {proposal.status === 'pending' ? 'ממתין' : proposal.status === 'accepted' ? 'מאושר' : 'נדחה'}
        </Badge>
      </div>

      {/* Proposal Content */}
      <div className="mb-4 bg-white/70 backdrop-blur-sm p-4 rounded-2xl border-0 shadow-lg shadow-gray-500/5">
        <p className="text-gray-800 mb-3 leading-relaxed">{proposal.description}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">רווח נטו:</span>
            <span className="font-bold text-green-600 text-lg">
              {proposal.price ? formatCurrency(professionalNetEarnings) : 'מחיר לא צוין'}
            </span>
          </div>
          {proposal.estimated_completion && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">זמן עבודה:</span>
              <span className="font-semibold">{proposal.estimated_completion}</span>
            </div>
          )}
        </div>

        {proposal.lower_price_willing && proposal.lower_price_value && (
          <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
            <span className="text-green-700 font-medium">
              ✓ מוכן להוריד מחיר ל-{formatCurrency(calculateProfessionalNetEarnings(proposal.lower_price_value))} (רווח נטו)
            </span>
          </div>
        )}
      </div>

      {/* Earnings Info */}
      {isOwner && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl mb-4 border-0 shadow-lg shadow-green-500/10">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">העמלה שלך: </span>
              <span className="font-bold text-green-600">{formatCurrency(earnings.leadCommission)}</span>
            </div>
            <div>
              <span className="text-gray-600">עמלת oFair: </span>
              <span className="text-red-600 font-medium">{formatCurrency(earnings.oFairCommission)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Work Info */}
      {proposal.scheduled_date && (
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex items-center gap-1">
            <CalendarIcon size={14} />
            <span>תאריך: {format(new Date(proposal.scheduled_date), 'dd/MM/yyyy')}</span>
          </div>
          {proposal.scheduled_time && (
            <div className="flex items-center gap-1">
              <ClockIcon size={14} />
              <span>שעה: {proposal.scheduled_time}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isOwner && (
        <>
          {proposal.status === 'pending' && (
            <div className="flex gap-2 pt-3 border-t">
              <Button
                onClick={() => onUpdateStatus(proposal.id, 'accepted')}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 font-medium"
                disabled={isUpdating}
              >
                {isUpdating ? 'מעדכן...' : 'אשר הצעה'}
              </Button>
              <Button
                onClick={() => onUpdateStatus(proposal.id, 'rejected')}
                variant="destructive"
                className="flex-1 font-medium"
                disabled={isUpdating}
              >
                דחה הצעה
              </Button>
            </div>
          )}

          {proposal.status === 'rejected' && (
            <div className="pt-3 border-t">
              <Button
                onClick={() => onUpdateStatus(proposal.id, 'accepted')}
                className="bg-green-600 hover:bg-green-700 text-white w-full font-medium flex items-center justify-center gap-2"
                disabled={isUpdating}
              >
                <RotateCcw size={16} />
                {isUpdating ? 'מעדכן...' : 'ביטול דחיה וקבלת הצעה'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
        נשלח: {format(new Date(proposal.created_at), 'dd/MM/yyyy HH:mm')}
      </div>
    </div>
  );
};

export default ProposalCard;
