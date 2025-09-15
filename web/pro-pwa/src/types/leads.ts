
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
  profession?: string;
  constraints?: string;
  image_urls?: string[];
}

export interface LeadProposal {
  id: string;
  professional_id: string;
  lead_id: string;
  price: number;
  description: string;
  status: string;
  created_at: string;
  estimated_completion?: string;
  // Extended properties added when fetching with professional details
  professional_name?: string;
  professional_phone?: string;
  professional_profession?: string;
  professional_location?: string;
  professional_rating?: number;
  // New properties for professionals join
  professionals?: {
    id: string;
    name: string;
    phone_number: string;
    profession: string;
    location: string;
    rating: number;
  };
}

// Request quote type - for quotes on consumer requests
export interface RequestQuote {
  id: string;
  professional_id: string;
  request_id: string;
  price: string;
  description: string;
  status: string;
  created_at: string;
  estimated_time?: string;
}
