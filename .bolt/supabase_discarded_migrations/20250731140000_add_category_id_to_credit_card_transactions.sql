-- Add category_id column to credit_card_transactions table
ALTER TABLE credit_card_transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for better performance on category_id queries
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_category_id 
ON credit_card_transactions(category_id);

-- Update RLS policies to include category_id in the context
-- (if needed, depending on your existing policies)

-- Add comment to document the change
COMMENT ON COLUMN credit_card_transactions.category_id IS 'Reference to the category this transaction belongs to'; 