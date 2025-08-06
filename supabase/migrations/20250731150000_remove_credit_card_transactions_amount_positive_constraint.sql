-- Remove constraint that prevents negative amounts in credit_card_transactions
-- This allows payments (negative amounts) to be recorded in the transactions table

-- Drop the existing constraint
ALTER TABLE credit_card_transactions 
DROP CONSTRAINT IF EXISTS credit_card_transactions_amount_positive;

-- Add a new constraint that allows both positive and negative amounts
ALTER TABLE credit_card_transactions 
ADD CONSTRAINT credit_card_transactions_amount_not_zero CHECK (amount != 0);

-- Add comment to document the change
COMMENT ON COLUMN credit_card_transactions.amount IS 'Transaction amount. Positive for purchases, negative for payments'; 