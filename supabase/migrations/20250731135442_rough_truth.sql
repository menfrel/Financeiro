/*
  # Adicionar método de pagamento aos orçamentos

  1. Alterações na tabela budgets
    - Adicionar coluna `payment_method` (enum: 'account', 'credit_card')
    - Adicionar coluna `credit_card_id` (referência opcional para credit_cards)
    - Adicionar constraint para garantir que credit_card_id seja obrigatório quando payment_method = 'credit_card'

  2. Segurança
    - Manter RLS existente
    - Adicionar foreign key constraint para credit_card_id
*/

-- Criar enum para método de pagamento
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM ('account', 'credit_card');
  END IF;
END $$;

-- Adicionar colunas à tabela budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE budgets ADD COLUMN payment_method payment_method_type DEFAULT 'account';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'credit_card_id'
  ) THEN
    ALTER TABLE budgets ADD COLUMN credit_card_id uuid;
  END IF;
END $$;

-- Adicionar foreign key constraint para credit_card_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'budgets_credit_card_id_fkey'
  ) THEN
    ALTER TABLE budgets 
    ADD CONSTRAINT budgets_credit_card_id_fkey 
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar constraint para garantir que credit_card_id seja obrigatório quando payment_method = 'credit_card'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'budgets_credit_card_required_check'
  ) THEN
    ALTER TABLE budgets 
    ADD CONSTRAINT budgets_credit_card_required_check 
    CHECK (
      (payment_method = 'account' AND credit_card_id IS NULL) OR
      (payment_method = 'credit_card' AND credit_card_id IS NOT NULL)
    );
  END IF;
END $$;

-- Adicionar índice para melhor performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_budgets_credit_card_id'
  ) THEN
    CREATE INDEX idx_budgets_credit_card_id ON budgets(credit_card_id) WHERE credit_card_id IS NOT NULL;
  END IF;
END $$;