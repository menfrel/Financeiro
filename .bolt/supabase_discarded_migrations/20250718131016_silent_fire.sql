/*
  # Adicionar recorrência aos pagamentos de pacientes

  1. Alterações na tabela
    - `is_recurring` (boolean) - Se o pagamento é recorrente
    - `recurring_frequency` (enum) - Frequência da recorrência
    - `recurring_until` (date) - Data limite da recorrência
    - `parent_payment_id` (uuid) - Referência ao pagamento pai (para pagamentos gerados)

  2. Segurança
    - Manter RLS existente
    - Adicionar constraints para validação
*/

-- Adicionar colunas de recorrência
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'recurring_frequency'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN recurring_frequency recurring_frequency;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'recurring_until'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN recurring_until date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'parent_payment_id'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN parent_payment_id uuid;
  END IF;
END $$;

-- Adicionar foreign key para parent_payment_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'patient_payments_parent_payment_id_fkey'
  ) THEN
    ALTER TABLE patient_payments 
    ADD CONSTRAINT patient_payments_parent_payment_id_fkey 
    FOREIGN KEY (parent_payment_id) REFERENCES patient_payments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar constraints de validação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'patient_payments_recurring_check'
  ) THEN
    ALTER TABLE patient_payments 
    ADD CONSTRAINT patient_payments_recurring_check 
    CHECK (
      (is_recurring = false AND recurring_frequency IS NULL AND recurring_until IS NULL) OR
      (is_recurring = true AND recurring_frequency IS NOT NULL)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'patient_payments_recurring_until_check'
  ) THEN
    ALTER TABLE patient_payments 
    ADD CONSTRAINT patient_payments_recurring_until_check 
    CHECK (
      recurring_until IS NULL OR recurring_until > payment_date
    );
  END IF;
END $$;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_patient_payments_recurring 
ON patient_payments (user_id, is_recurring) 
WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS idx_patient_payments_parent 
ON patient_payments (parent_payment_id) 
WHERE parent_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_payments_date_month 
ON patient_payments (user_id, date_trunc('month', payment_date::date));