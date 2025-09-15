
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Coins,
  Receipt,
  User,
  Home,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import LeadProposalForm from "./LeadProposalForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ExpandableText from "@/components/ui/ExpandableText";

interface LeadCardProps {
  leadId: string;
  title: string;
  description: string;
  location: string;
  budget?: number | null;
  isShared?: boolean;
  sharePercentage?: number;
  imageUrl?: string;
  professionalId?: string;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  workDate?: string;
  workTime?: string;
  notes?: string;
  isUserOwned?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({
  leadId,
  title,
  description,
  location,
  budget,
  isShared = false,
  sharePercentage = 0,
  imageUrl,
  professionalId,
  clientName,
  clientPhone,
  clientAddress,
  workDate,
  workTime,
  notes,
  isUserOwned = false
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const displayBudget = budget
    ? sharePercentage > 0
      ? budget - (budget * sharePercentage) / 100
      : budget
    : null;

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (err) {
        console.error("Error checking authentication:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleProposalClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "התחברות נדרשת",
        description: "יש להתחבר למערכת כדי להגיש הצעת מחיר",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    setShowProposalForm(true);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <Card className={`overflow-hidden border border-brand-neutral200/60 bg-white/90 rounded-2xl shadow-soft-md transition-all duration-200 hover:shadow-soft-lg ${isUserOwned ? 'ring-2 ring-brand-primary ring-offset-2' : ''}`}>
      {isUserOwned && (
        <div className="bg-gradient-to-r from-ofair-blue to-blue-600 text-white text-xs text-center py-2 rounded-t-3xl font-medium">
          מודעה שלי
        </div>
      )}
      
      {imageUrl && (
        <div className="w-full h-48 overflow-hidden rounded-t-2xl">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="pb-2 pt-6 px-6">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold text-gray-800">{title}</CardTitle>
          {isShared && sharePercentage > 0 && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
              ליד לשיתוף ({sharePercentage}%)
            </Badge>
          )}
        </div>
        <div className="flex items-center text-slate-600 text-sm mt-2">
          <MapPin size={16} className="text-slate-500 ml-2" />
          <span>{location}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ExpandableText 
          text={description}
          wordLimit={15}
          className="text-gray-700 mb-4"
          showButtonInline={false}
        />

        {notes && (
          <div className="mb-4 p-3 bg-brand-neutral50 rounded-md border border-brand-neutral200/60">
            <p className="text-sm text-gray-600">
              <span className="font-medium">הערות:</span> {notes}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center">
          {budget ? (
            <div>
              <div className="text-lg font-bold text-emerald-700">
                {formatCurrency(displayBudget || 0)}
              </div>
              {sharePercentage > 0 && (
                <div className="text-xs text-gray-500">
                  <span className="line-through">{formatCurrency(budget)}</span>
                  <span className="text-emerald-600 mr-1">
                    ({sharePercentage}% הנחה)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-500 text-sm">תקציב לא צוין</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDetails}
            className="flex items-center text-slate-600"
          >
            {showDetails ? (
              <>
                <ChevronUp size={16} className="mr-1" /> פחות פרטים
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-1" /> יותר פרטים
              </>
            )}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-3 text-sm border-t pt-3">
            {workDate && (
              <div className="flex items-center">
                <Calendar size={16} className="text-slate-500 ml-2" />
                <span>תאריך עבודה: {workDate}</span>
              </div>
            )}

            {workTime && (
              <div className="flex items-center">
                <Clock size={16} className="text-slate-500 ml-2" />
                <span>שעה: {workTime}</span>
              </div>
            )}

            {showContactInfo && (
              <div className="space-y-2 border-t pt-2 mt-2">
                {clientName && (
                  <div className="flex items-center">
                    <User size={16} className="text-slate-500 ml-2" />
                    <span>שם: {clientName}</span>
                  </div>
                )}

                {clientPhone && (
                  <div className="flex items-center">
                    <Phone size={16} className="text-slate-500 ml-2" />
                    <span>טלפון: {clientPhone}</span>
                  </div>
                )}

                {clientAddress && (
                  <div className="flex items-center">
                    <Home size={16} className="text-slate-500 ml-2" />
                    <span>כתובת: {clientAddress}</span>
                  </div>
                )}
              </div>
            )}

            {(clientName || clientPhone || clientAddress) && !showContactInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContactInfo(true)}
                className="w-full mt-2"
              >
                הצג פרטי קשר
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-0">
        {!isUserOwned && (
          <Button
            onClick={handleProposalClick}
            className="w-full bg-brand-primary hover:bg-brand-primary/90"
          >
            <Receipt className="mr-1" size={16} />
            הגש הצעת מחיר
          </Button>
        )}
        
        {isUserOwned && (
          <Button
            variant="outline"
            onClick={() => navigate('/my-jobs?tab=proposals')}
            className="w-full"
          >
            <Coins className="mr-1" size={16} />
            צפה בהצעות
          </Button>
        )}
      </CardFooter>

      {showProposalForm && (
        <LeadProposalForm
          leadId={leadId}
          leadTitle={title}
          leadBudget={budget || 0}
          sharePercentage={sharePercentage}
          onClose={() => setShowProposalForm(false)}
        />
      )}
    </Card>
  );
};

export default LeadCard;
