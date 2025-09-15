
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lead } from "@/types/leads";
import LeadDetailsForm from "./LeadDetailsForm";
import ClientDetailsForm from "./ClientDetailsForm";
import EnhancedCommissionSlider from "./EnhancedCommissionSlider";
import EditLeadFormActions from "./edit/EditLeadFormActions";
import { useEditLeadForm } from "./edit/useEditLeadForm";

interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onLeadUpdated: () => void;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({
  open,
  onOpenChange,
  lead,
  onLeadUpdated
}) => {
  const {
    formData,
    setters,
    state,
    actions
  } = useEditLeadForm({
    lead,
    open,
    onLeadUpdated,
    onClose: () => onOpenChange(false)
  });

  // Calculate max commission based on estimated price (same logic as in SubmitLead)
  const hasEstimatedPrice = formData.estimatedPrice && parseFloat(formData.estimatedPrice) > 0;
  const maxCommission = hasEstimatedPrice ? 30 : 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 mx-auto box-border min-w-0" dir="rtl">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">עריכת ליד: {lead?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <LeadDetailsForm
            title={formData.title}
            setTitle={setters.setTitle}
            description={formData.description}
            setDescription={setters.setDescription}
            city={formData.city}
            setCity={setters.setCity}
            profession={formData.profession}
            setProfession={setters.setProfession}
            estimatedPrice={formData.estimatedPrice}
            setEstimatedPrice={setters.setEstimatedPrice}
            notes={formData.notes}
            setNotes={setters.setNotes}
            constraints={formData.constraints}
            setConstraints={setters.setConstraints}
            workDate={formData.workDate}
            setWorkDate={setters.setWorkDate}
            workTime={formData.workTime}
            setWorkTime={setters.setWorkTime}
          />

          <EnhancedCommissionSlider
            sharePercentage={formData.sharePercentage}
            setSharePercentage={setters.setSharePercentage}
            maxValue={maxCommission}
            estimatedPrice={formData.estimatedPrice}
          />

          <ClientDetailsForm
            clientName={formData.clientName}
            setClientName={setters.setClientName}
            clientPhone={formData.clientPhone}
            setClientPhone={setters.setClientPhone}
            clientAddress={formData.clientAddress}
            setClientAddress={setters.setClientAddress}
          />

          <EditLeadFormActions
            lead={lead}
            isSubmitting={state.isSubmitting}
            isDeleting={state.isDeleting}
            setIsDeleting={state.setIsDeleting}
            onSave={actions.handleSave}
            onClose={() => onOpenChange(false)}
            onLeadUpdated={onLeadUpdated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLeadModal;
