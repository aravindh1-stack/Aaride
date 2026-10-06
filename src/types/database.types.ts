export interface Admin {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  password_hash: string;
  vehicle_number: string;
  vehicle_model: string;
  license_number: string;
  is_active: boolean;
  created_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  doc_type: string;
  doc_number?: string | null;
  file_url: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  created_at: string;
}

export interface DriverFamily {
  id: string;
  driver_id: string;
  member_name: string;
  relation: string;
  dob?: string | null;
  created_at: string;
}

export interface DriverLedger {
  id: string;
  driver_id: string;
  entry_date: string;
  income: number;
  expense: number;
  notes?: string | null;
  created_at: string;
}

// Request & Response helper types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
