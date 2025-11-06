/*
  # Fix Remaining Security Issues

  1. Add Missing Foreign Key Indexes
    - budgets.credit_card_id
    - transfers.from_account_id
    - transfers.to_account_id

  2. Remove Unused Indexes
    - idx_categories_parent_id
    - idx_credit_card_invoices_credit_card_id
    - idx_patient_payments_session_id
    - idx_patient_payments_transaction_id_fk

  3. Fix Function Search Path
    - create_default_categories with proper search_path
*/

-- ============================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================

-- Index for budgets.credit_card_id
CREATE INDEX IF NOT EXISTS idx_budgets_credit_card_id_fkey 
  ON budgets(credit_card_id) 
  WHERE credit_card_id IS NOT NULL;

-- Index for transfers.from_account_id
CREATE INDEX IF NOT EXISTS idx_transfers_from_account_id_fkey 
  ON transfers(from_account_id);

-- Index for transfers.to_account_id
CREATE INDEX IF NOT EXISTS idx_transfers_to_account_id_fkey 
  ON transfers(to_account_id);

-- ============================================
-- PART 2: Remove Unused Indexes
-- ============================================

DROP INDEX IF EXISTS idx_categories_parent_id;
DROP INDEX IF EXISTS idx_credit_card_invoices_credit_card_id;
DROP INDEX IF EXISTS idx_patient_payments_session_id;
DROP INDEX IF EXISTS idx_patient_payments_transaction_id_fk;

-- ============================================
-- PART 3: Fix create_default_categories Function
-- ============================================

-- Drop and recreate with proper search_path configuration
DROP FUNCTION IF EXISTS create_default_categories(uuid);

CREATE OR REPLACE FUNCTION create_default_categories(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- Set search_path to empty and explicitly qualify all references
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color)
  VALUES
    (p_user_id, 'Salary', 'income', '#10B981'),
    (p_user_id, 'Freelance', 'income', '#3B82F6'),
    (p_user_id, 'Food', 'expense', '#EF4444'),
    (p_user_id, 'Transport', 'expense', '#F59E0B'),
    (p_user_id, 'Entertainment', 'expense', '#8B5CF6'),
    (p_user_id, 'Healthcare', 'expense', '#EC4899'),
    (p_user_id, 'Shopping', 'expense', '#6366F1')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_categories(uuid) TO authenticated;
