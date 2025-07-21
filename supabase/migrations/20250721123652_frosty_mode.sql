/*
  # Adicionar suporte a pagamentos recorrentes para pacientes

  1. Modificações na tabela patient_payments
    - Adicionar campo `is_recurring` (boolean)
    - Adicionar campo `recurring_frequency` (enum: weekly, monthly)
    - Adicionar campo `recurring_until` (date)
    - Adicionar campo `recurring_day` (integer) para dia específico do mês
    - Adicionar campo `parent_payment_id` para rastrear pagamentos gerados automaticamente

  2. Índices
    - Adicionar índice para pagamentos recorrentes
    - Adicionar índice para data de recorrência

  3. Constraints
    - Validar campos de recorrência
    - Validar dia de recorrência
*/

-- Adicionar campos de recorrência à tabela patient_payments
DO $$
BEGIN
  -- Adicionar is_recurring
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;

  -- Adicionar recurring_frequency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'recurring_frequency'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN recurring_frequency recurring_frequency;
  END IF;

  -- Adicionar recurring_until
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'recurring_until'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN recurring_until date;
  END IF;

  -- Adicionar recurring_day
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'recurring_day'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN recurring_day integer;
  END IF;

  -- Adicionar parent_payment_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_payments' AND column_name = 'parent_payment_id'
  ) THEN
    ALTER TABLE patient_payments ADD COLUMN parent_payment_id uuid REFERENCES patient_payments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_patient_payments_recurring 
ON patient_payments (user_id, is_recurring) 
WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS idx_patient_payments_recurring_until 
ON patient_payments (recurring_until) 
WHERE recurring_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_payments_parent 
ON patient_payments (parent_payment_id) 
WHERE parent_payment_id IS NOT NULL;

-- Adicionar constraints para validação
DO $$
BEGIN
  -- Constraint para validar campos de recorrência
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'patient_payments_recurring_check'
  ) THEN
    ALTER TABLE patient_payments ADD CONSTRAINT patient_payments_recurring_check
    CHECK (
      (is_recurring = false AND recurring_frequency IS NULL AND recurring_until IS NULL AND recurring_day IS NULL) OR
      (is_recurring = true AND recurring_frequency IS NOT NULL AND recurring_day IS NOT NULL)
    );
  END IF;

  -- Constraint para validar dia de recorrência
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'patient_payments_recurring_day_check'
  ) THEN
    ALTER TABLE patient_payments ADD CONSTRAINT patient_payments_recurring_day_check
    CHECK (recurring_day IS NULL OR (recurring_day >= 1 AND recurring_day <= 31));
  END IF;

  -- Constraint para validar data de término
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'patient_payments_recurring_until_check'
  ) THEN
    ALTER TABLE patient_payments ADD CONSTRAINT patient_payments_recurring_until_check
    CHECK (recurring_until IS NULL OR recurring_until > CURRENT_DATE);
  END IF;
END $$;