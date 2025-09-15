
export interface ProjectType {
  id: string;
  title: string;
  client: string;
  price: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'on-hold' | 'not_started' | 'in_progress';
  progress: number;
}

export interface ProposalType {
  id: string;
  title: string;
  client: string;
  price: number | null; // Changed to allow null values
  date: string;
  status: string;
  leadId?: string;
  requestId?: string;
  description?: string;
  estimatedCompletion?: string;
  estimatedTime?: string;
  location?: string;
  type: 'lead' | 'request' | 'received_lead';
  request_status?: string;
  created_at?: string;
  final_amount?: number; // Added for completed proposals
}

export interface DirectInquiryType {
  id: number | string;
  client: string;
  phoneNumber: string;
  date: string;
  service: string;
  isContacted: boolean;
  isClosed: boolean;
}
