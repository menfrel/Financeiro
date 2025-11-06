/*
  # Credit Card Invoices - Sistema de Faturas

  1. Nova Tabela
    - `credit_card_invoices`: Armazena faturas fechadas de cada período
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário)
      - `credit_card_id` (uuid, referência ao cartão)
      - `cycle_start` (date, início do período de fechamento)
      - `cycle_end` (date, final do período de fechamento)
      - `due_date` (date, data de vencimento da fatura)
      - `purchases_total` (numeric, total de compras do período)
      - `payments_total` (numeric, total de pagamentos do período)
      - `previous_balance` (numeric, saldo devedor do período anterior)
      - `total_due` (numeric, total a pagar = compras + saldo anterior - pagamentos)
      - `paid_amount` (numeric, valor já pago nesta fatura)
      - `status` (text, 'open', 'closed', 'overdue')
      - `created_at`, `updated_at` (timestamps)

  2. Segurança (RLS)
    - Enable RLS na tabela
    - Usuários só podem ver suas próprias faturas

  3. Relacionamentos
    - Foreign key com credit_cards
    - Foreign key com users
*/

DO $$
BEGIN
  -- Criar tipo enum para status se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('open', 'closed', 'overdue');
  END IF;
END $$;

-- A tabela credit_card_invoices já foi criada, então apenas garantimos que ela tenha as colunas certas
DO $$
BEGIN
  -- Verificar se a coluna status precisa ser alterada
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_card_invoices' 
    AND column_name = 'status'
    AND data_type != 'text'
  ) THEN
    ALTER TABLE credit_card_invoices ALTER COLUMN status SET DATA TYPE text;
  END IF;
END $$;

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON credit_card_invoices;

-- Criar novas políticas de segurança
CREATE POLICY "Users can view own invoices"
  ON credit_card_invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON credit_card_invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON credit_card_invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
