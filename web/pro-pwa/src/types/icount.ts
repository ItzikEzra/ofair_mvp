export interface ICountTransaction {
  id: string;
  professional_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  icount_transaction_id?: string;
  confirmation_code?: string;
  status: 'pending' | 'completed' | 'failed' | 'session_created';
  request_payload?: any;
  response_payload?: any;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalBillingDetails {
  id: string;
  professional_id: string;
  business_name?: string;
  vat_id?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  created_at: string;
  updated_at: string;
}