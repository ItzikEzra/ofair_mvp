
export interface Certificate {
  id: string;
  professional_id: string;
  certificate_name: string;
  certificate_url: string;
  file_name: string;
  file_size?: number;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface CertificateUpload {
  file: File;
  name: string;
}
