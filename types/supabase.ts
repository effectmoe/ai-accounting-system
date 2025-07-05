export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          name_kana: string | null
          tax_number: string | null
          invoice_registration_number: string | null
          fiscal_year_start: number | null
          address: Json | null
          contact_info: Json | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_kana?: string | null
          tax_number?: string | null
          invoice_registration_number?: string | null
          fiscal_year_start?: number | null
          address?: Json | null
          contact_info?: Json | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_kana?: string | null
          tax_number?: string | null
          invoice_registration_number?: string | null
          fiscal_year_start?: number | null
          address?: Json | null
          contact_info?: Json | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          company_id: string
          code: string
          name: string
          name_kana: string | null
          account_type: string
          parent_account_id: string | null
          is_active: boolean
          balance: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          code: string
          name: string
          name_kana?: string | null
          account_type: string
          parent_account_id?: string | null
          is_active?: boolean
          balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          code?: string
          name?: string
          name_kana?: string | null
          account_type?: string
          parent_account_id?: string | null
          is_active?: boolean
          balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          company_id: string
          transaction_number: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          description: string | null
          reference_number: string | null
          created_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          transaction_number?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          description?: string | null
          reference_number?: string | null
          created_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          transaction_number?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          description?: string | null
          reference_number?: string | null
          created_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          invoice_number: string
          transaction_id: string | null
          customer_id: string | null
          issue_date: string
          due_date: string | null
          payment_date: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          status: string
          invoice_data: Json | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_number: string
          transaction_id?: string | null
          customer_id?: string | null
          issue_date: string
          due_date?: string | null
          payment_date?: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          status?: string
          invoice_data?: Json | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_number?: string
          transaction_id?: string | null
          customer_id?: string | null
          issue_date?: string
          due_date?: string | null
          payment_date?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          invoice_data?: Json | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      transaction_type: 'income' | 'expense' | 'transfer' | 'adjustment'
      transaction_status: 'pending' | 'completed' | 'cancelled' | 'reconciled'
      document_type: 'invoice' | 'receipt' | 'bill' | 'statement' | 'report'
      audit_action: 'create' | 'update' | 'delete' | 'approve' | 'reject'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
