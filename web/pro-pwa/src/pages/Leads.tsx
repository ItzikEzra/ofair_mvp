
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/ui/section-header";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import { Loader2, PlusCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/leads";
import LeadCard from "@/components/leads/LeadCard";
import { useAuth } from "@/contexts/auth/AuthContext";
import { LeadsService } from "@/services/leadsService";

const Leads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { isLoggedIn, professionalData } = useAuth();

  useEffect(() => {
    if (!isLoggedIn || !professionalData) {
      setIsLoading(false);
      return;
    }

    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        setError("");

        console.log("Fetching active leads from new microservices");
        const data = await LeadsService.getPublicLeads();

        console.log(`Received ${data?.length || 0} leads from the API`);
        setLeads(data || []);
      } catch (err) {
        console.error("Failed to fetch leads:", err);
        setError("אירעה שגיאה בלתי צפויה, נסה שוב מאוחר יותר");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [isLoggedIn, professionalData]);

  const handleActionClick = (path: string) => {
    if (!isLoggedIn) {
      toast({
        title: "התחברות נדרשת",
        description: "יש להתחבר למערכת כדי לבצע פעולה זו",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    navigate(path);
  };

  return (
    <MainLayout title="לוח מודעות">
      <div className="min-h-screen">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <SectionHeader
              title="לוח המודעות"
              subtitle={leads.length > 0 ? `${leads.length} לידים זמינים לעבודה` : "אין לידים זמינים כרגע"}
              icon={<Search size={18} />}
            />
            <Button 
              onClick={() => handleActionClick("/submit-lead")}
              className="rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90"
            >
              <PlusCircle size={18} className="ml-2" />
              פרסם ליד חדש
            </Button>
          </div>
          
          {/* Content Section */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl shadow-blue-500/10">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-blue-600" />
                  <p className="text-xl font-medium text-gray-700 mb-2">טוען לוח מודעות</p>
                  <p className="text-gray-500">מחפש את הלידים הטובים ביותר עבורך...</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <ErrorState message={error} retry={() => window.location.reload()} />
          ) : leads.length === 0 ? (
            <EmptyState
              title="אין לידים להצגה כרגע"
              description="כל הלידים הזמינים כבר הוגשו עליהם הצעות או שאין כרגע לידים חדשים"
              icon={<Search size={28} />}
              action={
                <Button onClick={() => handleActionClick('/submit-lead')} className="rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90">
                  <PlusCircle size={18} className="ml-2" />
                  פרסם ליד ראשון
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  leadId={lead.id}
                  title={lead.title}
                  description={lead.description}
                  location={lead.location}
                  budget={lead.budget || 0}
                  isShared={lead.share_percentage > 0}
                  sharePercentage={lead.share_percentage}
                  imageUrl={lead.image_url}
                  professionalId={lead.professional_id || undefined}
                  clientName={lead.client_name}
                  clientPhone={lead.client_phone}
                  clientAddress={lead.client_address}
                  workDate={lead.work_date}
                  workTime={lead.work_time}
                  notes={lead.notes}
                  isUserOwned={professionalId === lead.professional_id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Leads;
