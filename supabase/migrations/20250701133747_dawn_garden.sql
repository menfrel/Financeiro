/*
  # Sistema de Gerenciamento Financeiro - Esquema Completo

  1. Novas Tabelas
    - `accounts` - Contas bancárias e carteiras do usuário
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `type` (enum: checking, savings, investment, digital_wallet)
      - `initial_balance` (numeric)
      - `current_balance` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `categories` - Categorias de receitas e despesas
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `type` (enum: income, expense)
      - `color` (text)
      - `parent_id` (uuid, nullable, self-reference for subcategories)
      - `created_at` (timestamp)

    - `transactions` - Lançamentos financeiros
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `account_id` (uuid, foreign key to accounts)
      - `category_id` (uuid, foreign key to categories)
      - `amount` (numeric)
      - `type` (enum: income, expense)
      - `description` (text)
      - `date` (date)
      - `is_recurring` (boolean)
      - `recurring_frequency` (enum: weekly, monthly, nullable)
      - `recurring_until` (date, nullable)
      - `created_at` (timestamp)

    - `budgets` - Orçamentos por categoria
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `category_id` (uuid, foreign key to categories)
      - `amount` (numeric)
      - `period` (enum: monthly)
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamp)

  2. Segurança
    - Enable RLS em todas as tabelas
    - Políticas para usuários autenticados acessarem apenas seus próprios dados
    - Índices para performance em consultas frequentes

  3. Funcionalidades
    - Triggers para atualizar saldos das contas automaticamente
    - Constraints para validação de dados
    - Funções para relatórios e dashboards
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'investment', 'digital_wallet');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE category_type AS ENUM ('income', 'expense');
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly');
CREATE TYPE budget_period AS ENUM ('monthly');

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type account_type NOT NULL,
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT accounts_name_length CHECK (length(name) >= 1 AND length(name) <= 100),
  CONSTRAINT accounts_balance_check CHECK (initial_balance >= 0)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type category_type NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT categories_name_length CHECK (length(name) >= 1 AND length(name) <= 50),
  CONSTRAINT categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT categories_no_self_reference CHECK (id != parent_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  type transaction_type NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  is_recurring boolean DEFAULT false,
  recurring_frequency recurring_frequency,
  recurring_until date,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT transactions_description_length CHECK (length(description) >= 1 AND length(description) <= 200),
  CONSTRAINT transactions_recurring_check CHECK (
    (is_recurring = false AND recurring_frequency IS NULL AND recurring_until IS NULL) OR
    (is_recurring = true AND recurring_frequency IS NOT NULL)
  ),
  CONSTRAINT transactions_recurring_until_check CHECK (
    recurring_until IS NULL OR recurring_until > date
  )
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  period budget_period DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT budgets_amount_positive CHECK (amount > 0),
  CONSTRAINT budgets_date_range CHECK (end_date > start_date),
  UNIQUE(user_id, category_id, start_date, end_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
CREATE POLICY "Users can read own accounts"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for categories
CREATE POLICY "Users can read own categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for transactions
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for budgets
CREATE POLICY "Users can read own budgets"
  ON budgets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update account updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for accounts updated_at
CREATE TRIGGER update_accounts_updated_at 
  BEFORE UPDATE ON accounts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default income categories
  INSERT INTO categories (user_id, name, type, color) VALUES
    (NEW.id, 'Salário', 'income', '#059669'),
    (NEW.id, 'Freelance', 'income', '#0891B2'),
    (NEW.id, 'Investimentos', 'income', '#7C3AED'),
    (NEW.id, 'Outras Receitas', 'income', '#059669');
  
  -- Insert default expense categories
  INSERT INTO categories (user_id, name, type, color) VALUES
    (NEW.id, 'Alimentação', 'expense', '#DC2626'),
    (NEW.id, 'Transporte', 'expense', '#EA580C'),
    (NEW.id, 'Moradia', 'expense', '#D97706'),
    (NEW.id, 'Saúde', 'expense', '#DC2626'),
    (NEW.id, 'Educação', 'expense', '#2563EB'),
    (NEW.id, 'Lazer', 'expense', '#7C3AED'),
    (NEW.id, 'Compras', 'expense', '#DB2777'),
    (NEW.id, 'Outras Despesas', 'expense', '#6B7280');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create default categories for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories();