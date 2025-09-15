
export interface LeadPayment {
  id: string;
  lead_id: string;
  proposal_id: string;
  professional_id: string;
  final_amount: number;
  payment_method: string;
  share_percentage: number;
  commission_amount: number;
  created_at: string;
}

export interface PaymentDetails {
  leadTitle: string;
  finalAmount: number;
  paymentMethod: string;
  sharePercentage: number;
  commissionAmount: number;
  paymentDate: string;
  invoiceUrl?: string; // נוסיף עבור חשבונית
}
