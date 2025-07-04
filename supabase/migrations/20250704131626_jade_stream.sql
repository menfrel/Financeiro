/*
  # Adicionar Transferências e Cartões de Crédito

  1. Novas Tabelas
    - `transfers` - Transferências entre contas
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `from_account_id` (uuid, foreign key to accounts)
      - `to_account_id` (uuid, foreign key to accounts)
      - `amount` (numeric)
      - `description` (text)
      - `date` (date)
      - `created_at` (timestamp)

    - `credit_cards` - Cartões de crédito
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `limit_amount` (numeric)
      - `current_balance` (numeric)
      - `closing_day` (integer)
      - `due_day` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `credit_card_transactions` - Transações dos cartões
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `credit_card_id` (uuid, foreign key to credit_cards)
      - `amount` (numeric)
      - `description` (text)
      - `date` (date)
      - `installments` (integer)
      - `current_installment` (integer)
      - `created_at` (timestamp)

  2. Segurança
    - Enable RLS em todas as novas tabelas
    - Políticas para usuários autenticados acessarem apenas seus próprios dados
    - Índices para performance

  3. Constraints
    - Validações de dados
    - Verificações de integridade
*/

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT transfers_amount_positive CHECK (amount > 0),
  CONSTRAINT transfers_description_length CHECK (length(description) >= 1 AND length(description) <= 200),
  CONSTRAINT transfers_different_accounts CHECK (from_account_id != to_account_id)
);

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  limit_amount numeric(12,2) NOT NULL,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  closing_day integer NOT NULL,
  due_day integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT credit_cards_name_length CHECK (length(name) >= 1 AND length(name) <= 100),
  CONSTRAINT credit_cards_limit_positive CHECK (limit_amount > 0),
  CONSTRAINT credit_cards_balance_check CHECK (current_balance >= 0),
  CONSTRAINT credit_cards_closing_day_valid CHECK (closing_day >= 1 AND closing_day <= 31),
  CONSTRAINT credit_cards_due_day_valid CHECK (due_day >= 1 AND due_day <= 31)
);

-- Create credit_card_transactions table
CREATE TABLE IF NOT EXISTS credit_card_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credit_card_id uuid REFERENCES credit_cards(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  current_installment integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT credit_card_transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT credit_card_transactions_description_length CHECK (length(description) >= 1 AND length(description) <= 200),
  CONSTRAINT credit_card_transactions_installments_valid CHECK (installments >= 1 AND installments <= 24),
  CONSTRAINT credit_card_transactions_current_installment_valid CHECK (current_installment >= 1 AND current_installment <= installments)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_account_id ON transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account_id ON transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_user_id ON credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_credit_card_id ON credit_card_transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_date ON credit_card_transactions(date);

-- Enable Row Level Security
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transfers
CREATE POLICY "Users can read own transfers"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transfers"
  ON transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transfers"
  ON transfers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers"
  ON transfers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for credit_cards
CREATE POLICY "Users can read own credit cards"
  ON credit_cards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit cards"
  ON credit_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards"
  ON credit_cards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards"
  ON credit_cards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for credit_card_transactions
CREATE POLICY "Users can read own credit card transactions"
  ON credit_card_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit card transactions"
  ON credit_card_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit card transactions"
  ON credit_card_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit card transactions"
  ON credit_card_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for credit_cards updated_at
CREATE TRIGGER update_credit_cards_updated_at 
  BEFORE UPDATE ON credit_cards 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();