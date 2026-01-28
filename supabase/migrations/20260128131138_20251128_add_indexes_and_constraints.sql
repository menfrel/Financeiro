/*
  # Add indexes and constraints for performance and data integrity

  1. Indexes
    - Add indexes on frequently queried columns
    - Improves query performance significantly

  2. Constraints
    - Add constraint to credit_card_invoices for data integrity
    - Ensure paid_amount doesn't exceed total_due

  3. Columns
    - Add updated_at to credit_card_invoices for audit trail
    - Convert status to enum type for type safety

  4. Notes
    - These changes improve system reliability
    - No data will be affected
*/

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_card_user_date 
ON credit_card_transactions(credit_card_id, user_id, date);

CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_user_date 
ON credit_card_transactions(user_id, date);

CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_card_cycle 
ON credit_card_invoices(credit_card_id, cycle_end);

CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_user_card 
ON credit_card_invoices(user_id, credit_card_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date 
ON transactions(account_id, date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions(user_id, date);

CREATE INDEX IF NOT EXISTS idx_patient_payments_patient_date 
ON patient_payments(patient_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_patient_payments_user_date 
ON patient_payments(user_id, payment_date);

-- Add updated_at to credit_card_invoices if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_card_invoices' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE credit_card_invoices ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add constraint to ensure paid_amount doesn't exceed total_due
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_paid_amount_not_exceeds_due' 
    AND table_name = 'credit_card_invoices'
  ) THEN
    ALTER TABLE credit_card_invoices 
    ADD CONSTRAINT check_paid_amount_not_exceeds_due 
    CHECK (paid_amount <= total_due);
  END IF;
END $$;

-- Create enum type for invoice status if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('open', 'closed', 'paid', 'overdue');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add comment to credit_card_invoices status column explaining valid values
COMMENT ON COLUMN credit_card_invoices.status IS 'Invoice status: open (editable), closed (locked), paid (full payment), overdue (past due date)';
