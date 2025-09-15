
import React, { useState } from "react";
import { useProposalForm } from "@/hooks/useProposalForm";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import ProposalPriceInput from "@/components/leads/ProposalPriceInput";
import ProposalDescriptionInput from "@/components/leads/ProposalDescriptionInput";
import CompletionTimeSelector from "@/components/leads/CompletionTimeSelector";
import ProposalFormActions from "@/components/leads/ProposalFormActions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RequestProposalFormProps {
  requestId: string;
  requestTitle: string;
  onClose: () => void;
}

const RequestProposalForm: React.FC<RequestProposalFormProps> = ({
  requestId,
  requestTitle,
  onClose,
}) => {
  const { toast } = useToast();
  const { formData, isSubmitting, updateFormData, submitProposal } = useProposalForm(requestId, 'request');
  
  // Local state for price toggle
  const [showPriceField, setShowPriceField] = useState(Boolean(formData.price));
  
  const price = formData.price;
  const setPrice = (value: string) => updateFormData({ price: value });
  
  const handleTogglePriceSwitch = (checked: boolean) => {
    setShowPriceField(checked);
    if (!checked) {
      // When disabling, clear the price
      updateFormData({ price: "" });
    }
  };
  
  const description = formData.description;
  const setDescription = (value: string) => updateFormData({ description: value });
  const estimatedCompletion = formData.estimatedCompletion;
  const setEstimatedCompletion = (value: string) => updateFormData({ estimatedCompletion: value });
  const sampleImageUrls = formData.mediaUrls;
  const handleImageUploaded = (url: string) => updateFormData({ mediaUrls: [...formData.mediaUrls, url] });
  const removeImage = (index: number) => {
    const newUrls = [...formData.mediaUrls];
    newUrls.splice(index, 1);
    updateFormData({ mediaUrls: newUrls });
  };
  const success = false;
  const errorMessage = "";
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitProposal();
    if (result) {
      onClose();
    }
  };

  if (success) {
    return (
      <div className="text-center p-6" dir="rtl">
        <div className="text-green-600 mb-4">
          <CheckCircle2 className="mx-auto h-12 w-12" />
        </div>
        <h3 className="font-bold text-lg mb-2">ההצעה נשלחה בהצלחה</h3>
        <p className="text-gray-600 mb-4">ההצעה שלך נשלחה לבעל הבקשה</p>
      </div>
    );
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields for request quotes
    if (!estimatedCompletion) {
      toast({
        title: "שדות חובה",
        description: "יש להזין זמן אספקה משוער",
        variant: "destructive"
      });
      return;
    }

    handleSubmit(e);
  };

  return (
    <div className="p-4" dir="rtl">
      {/* Request summary */}
      <div className="bg-gray-50 p-3 rounded-md mb-4">
        <h3 className="font-bold">{requestTitle}</h3>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <Label htmlFor="suggest-price" className="text-sm font-medium">
            אני רוצה להציע מחיר
          </Label>
          <Switch
            id="suggest-price"
            checked={showPriceField}
            onCheckedChange={handleTogglePriceSwitch}
          />
        </div>
        
        {showPriceField && (
          <ProposalPriceInput 
            price={price} 
            setPrice={setPrice} 
            isRequired={false}
            label="מחיר מוצע (₪) (אופציונלי)"
          />
        )}
        
        <ProposalDescriptionInput 
          description={description} 
          setDescription={setDescription}
          isRequired={false}
          label="פרטי ההצעה (אופציונלי)"
        />
        
        <CompletionTimeSelector 
          completionTime={estimatedCompletion} 
          setCompletionTime={setEstimatedCompletion}
          isRequired={true}
          label="זמן אספקה משוער *"
        />
        
        <MultipleImageUpload 
          onImageUploaded={handleImageUploaded}
          bucketName="proposal-samples"
          label="העלה תמונה או וידאו להצעתך"
          currentImages={sampleImageUrls}
          onRemoveImage={(fileUrl: string) => {
            const index = sampleImageUrls.indexOf(fileUrl);
            if (index !== -1) removeImage(index);
          }}
          maxImages={5}
        />
        
        <ProposalFormActions 
          onClose={onClose} 
          isSubmitting={isSubmitting}
          submitText="שלח הצעה" 
        />
      </form>
    </div>
  );
};

export default RequestProposalForm;
