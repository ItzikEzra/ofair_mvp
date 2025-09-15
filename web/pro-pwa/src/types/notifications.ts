
export interface ClientDetails {
  name?: string;
  phone?: string;
  address?: string;
  workDate?: string;
  workTime?: string;
  notes?: string;
  date?: string;
  timing?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  related_type?: string;
  client_details?: ClientDetails | null;
}
