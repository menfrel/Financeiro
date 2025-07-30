/*
  # Adicionar campo description à tabela budgets

  1. Alterações na Tabela
    - Adicionar coluna `description` (text, opcional) à tabela `budgets`
    - Campo para permitir descrições personalizadas dos orçamentos

  2. Segurança
    - Nenhuma alteração nas políticas RLS necessária
    - Campo opcional, não afeta validações existentes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'description'
  ) THEN
    ALTER TABLE budgets ADD COLUMN description text;
  END IF;
END $$;