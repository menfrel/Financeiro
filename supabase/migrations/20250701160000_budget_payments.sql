-- Create budget_payments table
CREATE TABLE IF NOT EXISTS budget_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- formato: "2024-07"
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(budget_id, month)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_budget_payments_budget_month ON budget_payments(budget_id, month);

-- Enable RLS
ALTER TABLE budget_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own budget payments" ON budget_payments
  FOR SELECT USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own budget payments" ON budget_payments
  FOR INSERT WITH CHECK (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own budget payments" ON budget_payments
  FOR UPDATE USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own budget payments" ON budget_payments
  FOR DELETE USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_budget_payments_updated_at
  BEFORE UPDATE ON budget_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 