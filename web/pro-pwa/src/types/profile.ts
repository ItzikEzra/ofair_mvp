
export interface Professional {
  id: string;
  user_id?: string;
  name: string;
  profession: string;
  location?: string;
  areas?: string;
  about?: string;
  phone_number?: string;
  email?: string;
  working_hours?: string;
  specialties?: string[];
  languages?: string[];
  rating?: number;
  review_count?: number;
  image?: string;
  created_at?: string;
  updated_at?: string;
}
