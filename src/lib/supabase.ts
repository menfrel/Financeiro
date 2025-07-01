import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'checking' | 'savings' | 'investment' | 'digital_wallet'
          initial_balance: number
          current_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'checking' | 'savings' | 'investment' | 'digital_wallet'
          initial_balance: number
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'checking' | 'savings' | 'investment' | 'digital_wallet'
          initial_balance?: number
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          color: string
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          color?: string
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'income' | 'expense'
          color?: string
          parent_id?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string
          amount: number
          type: 'income' | 'expense'
          description: string
          date: string
          is_recurring: boolean
          recurring_frequency: 'weekly' | 'monthly' | null
          recurring_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id: string
          amount: number
          type: 'income' | 'expense'
          description: string
          date: string
          is_recurring?: boolean
          recurring_frequency?: 'weekly' | 'monthly' | null
          recurring_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string
          amount?: number
          type?: 'income' | 'expense'
          description?: string
          date?: string
          is_recurring?: boolean
          recurring_frequency?: 'weekly' | 'monthly' | null
          recurring_until?: string | null
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          period: 'monthly'
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount: number
          period?: 'monthly'
          start_date: string
          end_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          period?: 'monthly'
          start_date?: string
          end_date?: string
          created_at?: string
        }
      }
    }
  }
}