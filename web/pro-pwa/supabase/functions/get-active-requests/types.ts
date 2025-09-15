
// Request type from the database
export interface Request {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  timing?: string;
  status: string;
  created_at: string;
  updated_at: string;
  date: string;
  // Adding these new fields to match the main Request type
  category?: string;
  constraints?: string;
}

// Unified type for displaying both leads and requests
export interface Announcement {
  id: string;
  title: string;
  description: string;
  location: string;
  budget?: number;
  imageUrl?: string;
  createdAt: string;
  
  // Type discriminator
  type: 'lead' | 'request';
  
  // Lead-specific fields
  sharePercentage?: number;
  
  // Request-specific fields
  timing?: string;
  userId?: string;
  
  // New fields
  category?: string;
  constraints?: string;
}
