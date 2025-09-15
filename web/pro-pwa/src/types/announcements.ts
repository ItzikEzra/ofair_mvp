
export interface Announcement {
  id: string;
  title: string;
  description: string;
  location?: string;
  budget?: number;
  created_at: string;
  createdAt?: string; // Alternative field name for compatibility
  type: 'lead' | 'request';
  
  // Lead-specific fields
  share_percentage?: number;
  sharePercentage?: number; // Alternative field name for compatibility
  image_url?: string;
  image_urls?: string[];
  professional_id?: string;
  distance?: number;
  profession?: string; // Added this field
  
  // Client details fields - ADDED to fix build errors
  clientName?: string;
  client_name?: string;
  clientPhone?: string;
  client_phone?: string;
  clientAddress?: string;
  client_address?: string;
  
  // Work schedule fields - FIXED to support both formats
  workDate?: string;
  work_date?: string;
  workTime?: string;
  work_time?: string;
  timing?: string; // Computed field for display
  
  // Constraints field - FIXED to ensure proper mapping
  constraints?: string;
  notes?: string; // Alternative field name
  
  // Request-specific fields
  media_urls?: string[];
}

// Add Request interface that was missing
export interface Request {
  id: string;
  title: string;
  description: string;
  location: string;
  timing?: string;
  user_id: string;
  status: string;
  date: string;
  created_at: string;
  updated_at: string;
  media_urls?: string[];
  constraints?: string;
  category?: string;
}

export interface AnnouncementFilters {
  city: string;
  distance: string;
  category: string;
  areaRestriction?: string[];
  latitude?: number;
  longitude?: number;
  cityLatitude?: number;
  cityLongitude?: number;
}
