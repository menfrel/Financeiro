export interface Patient {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  notes?: string;
  status: "active" | "inactive" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  patient_id: string;
  session_date: string;
  duration_minutes: number;
  session_type: string;
  notes?: string;
  objectives?: string;
  homework?: string;
  next_session_date?: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface PatientPayment {
  id: string;
  user_id: string;
  patient_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  transaction_id?: string;
  is_recurring?: boolean;
  recurring_frequency?: "weekly" | "monthly";
  recurring_until?: string;
  parent_payment_id?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface PatientForm {
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  notes?: string;
  status: "active" | "inactive" | "archived";
}

export interface SessionForm {
  patient_id: string;
  session_date: string;
  duration_minutes: number;
  session_type: string;
  notes?: string;
  objectives?: string;
  homework?: string;
  next_session_date?: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
}

export interface PatientPaymentForm {
  patient_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  account_id?: string;
  create_transaction: boolean;
  is_recurring: boolean;
  recurring_frequency?: "weekly" | "monthly";
  recurring_until?: string;
}
