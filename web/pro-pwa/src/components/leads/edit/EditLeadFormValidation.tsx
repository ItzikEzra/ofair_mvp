
import { Lead } from "@/types/leads";

interface FormData {
  description: string;
  city: string;
  profession: string;
  estimatedPrice: string;
  notes: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  sharePercentage: number[];
}

interface ValidationErrors {
  description?: boolean;
  city?: boolean;
  profession?: boolean;
  clientName?: boolean;
  clientPhone?: boolean;
  clientAddress?: boolean;
}

export const validateEditLeadForm = (formData: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  if (!formData.description.trim()) {
    errors.description = true;
  }
  
  if (!formData.city.trim()) {
    errors.city = true;
  }
  
  if (!formData.profession.trim()) {
    errors.profession = true;
  }
  
  if (!formData.clientName.trim()) {
    errors.clientName = true;
  }
  
  if (!formData.clientPhone.trim()) {
    errors.clientPhone = true;
  }
  
  if (!formData.clientAddress.trim()) {
    errors.clientAddress = true;
  }
  
  return errors;
};

export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some(error => error === true);
};
