
export interface Lead {
  id: string;
  title: string;
  description: string;
  location: string;
  budget: number | null;
  status: string;
  created_at: string;
  professional_id: string | null;
  share_percentage: number;
  image_url?: string;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  work_date?: string;
  work_time?: string;
  notes?: string;
  category?: string;
  constraints?: string;
}
