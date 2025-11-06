/*
  # Fix Security Issues

  1. Performance Improvements
    - Add missing indexes for foreign keys
    - Remove unused indexes
    - Optimize RLS policies with (select auth.uid())

  2. Foreign Key Indexes
    - categories.parent_id
    - credit_card_invoices.credit_card_id
    - patient_payments.session_id
    - patient_payments.transaction_id

  3. RLS Policy Optimization
    - Update all policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation for each row

  4. Function Security
    - Set proper search_path for all functions
*/

-- ============================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================

-- Index for categories.parent_id
CREATE INDEX IF NOT EXISTS idx_categories_parent_id 
  ON categories(parent_id) 
  WHERE parent_id IS NOT NULL;

-- Index for credit_card_invoices.credit_card_id
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_credit_card_id 
  ON credit_card_invoices(credit_card_id);

-- Index for patient_payments.session_id
CREATE INDEX IF NOT EXISTS idx_patient_payments_session_id 
  ON patient_payments(session_id) 
  WHERE session_id IS NOT NULL;

-- Index for patient_payments.transaction_id
CREATE INDEX IF NOT EXISTS idx_patient_payments_transaction_id_fk 
  ON patient_payments(transaction_id) 
  WHERE transaction_id IS NOT NULL;

-- ============================================
-- PART 2: Remove Unused Indexes
-- ============================================

DROP INDEX IF EXISTS idx_budgets_is_credit_card;
DROP INDEX IF EXISTS idx_patient_payments_status;
DROP INDEX IF EXISTS idx_transfers_from_account_id;
DROP INDEX IF EXISTS idx_transfers_to_account_id;
DROP INDEX IF EXISTS idx_transfers_date;
DROP INDEX IF EXISTS idx_sessions_date;
DROP INDEX IF EXISTS idx_categories_type;
DROP INDEX IF EXISTS idx_transactions_type;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_patient_payments_recurring;
DROP INDEX IF EXISTS idx_patient_payments_recurring_until;
DROP INDEX IF EXISTS idx_budgets_credit_card_id;

-- ============================================
-- PART 3: Optimize RLS Policies - Accounts
-- ============================================

DROP POLICY IF EXISTS "Users can read own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;

CREATE POLICY "Users can read own accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 4: Optimize RLS Policies - Categories
-- ============================================

DROP POLICY IF EXISTS "Users can read own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

CREATE POLICY "Users can read own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 5: Optimize RLS Policies - Transactions
-- ============================================

DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 6: Optimize RLS Policies - Budgets
-- ============================================

DROP POLICY IF EXISTS "Users can read own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

CREATE POLICY "Users can read own budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 7: Optimize RLS Policies - Users
-- ============================================

DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PART 8: Optimize RLS Policies - Transfers
-- ============================================

DROP POLICY IF EXISTS "Users can read own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can insert own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can delete own transfers" ON transfers;

CREATE POLICY "Users can read own transfers"
  ON transfers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own transfers"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own transfers"
  ON transfers FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own transfers"
  ON transfers FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 9: Optimize RLS Policies - Credit Cards
-- ============================================

DROP POLICY IF EXISTS "Users can read own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete own credit cards" ON credit_cards;

CREATE POLICY "Users can read own credit cards"
  ON credit_cards FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own credit cards"
  ON credit_cards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own credit cards"
  ON credit_cards FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own credit cards"
  ON credit_cards FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 10: Optimize RLS Policies - Credit Card Transactions
-- ============================================

DROP POLICY IF EXISTS "Users can read own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can insert own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can update own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can delete own credit card transactions" ON credit_card_transactions;

CREATE POLICY "Users can read own credit card transactions"
  ON credit_card_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own credit card transactions"
  ON credit_card_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own credit card transactions"
  ON credit_card_transactions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own credit card transactions"
  ON credit_card_transactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 11: Optimize RLS Policies - Patients
-- ============================================

DROP POLICY IF EXISTS "Users can read own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;

CREATE POLICY "Users can read own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 12: Optimize RLS Policies - Sessions
-- ============================================

DROP POLICY IF EXISTS "Users can read own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 13: Optimize RLS Policies - Patient Payments
-- ============================================

DROP POLICY IF EXISTS "Users can read own patient payments" ON patient_payments;
DROP POLICY IF EXISTS "Users can insert own patient payments" ON patient_payments;
DROP POLICY IF EXISTS "Users can update own patient payments" ON patient_payments;
DROP POLICY IF EXISTS "Users can delete own patient payments" ON patient_payments;

CREATE POLICY "Users can read own patient payments"
  ON patient_payments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own patient payments"
  ON patient_payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own patient payments"
  ON patient_payments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own patient payments"
  ON patient_payments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 14: Optimize RLS Policies - User Settings
-- ============================================

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- PART 15: Optimize RLS Policies - Budget Payments
-- ============================================

DROP POLICY IF EXISTS "Users can view their own budget payments" ON budget_payments;
DROP POLICY IF EXISTS "Users can insert their own budget payments" ON budget_payments;
DROP POLICY IF EXISTS "Users can update their own budget payments" ON budget_payments;
DROP POLICY IF EXISTS "Users can delete their own budget payments" ON budget_payments;

CREATE POLICY "Users can view their own budget payments"
  ON budget_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_payments.budget_id
      AND budgets.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert their own budget payments"
  ON budget_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_payments.budget_id
      AND budgets.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own budget payments"
  ON budget_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_payments.budget_id
      AND budgets.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_payments.budget_id
      AND budgets.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own budget payments"
  ON budget_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_payments.budget_id
      AND budgets.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PART 16: Optimize RLS Policies - Credit Card Invoices
-- ============================================

DROP POLICY IF EXISTS "Users can view own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON credit_card_invoices;

CREATE POLICY "Users can view own invoices"
  ON credit_card_invoices FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own invoices"
  ON credit_card_invoices FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own invoices"
  ON credit_card_invoices FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 17: Fix Function Search Paths
-- ============================================

-- Fix update_user_settings_updated_at
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP FUNCTION IF EXISTS update_user_settings_updated_at();

CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- Fix update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for tables that use this function
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_payments_updated_at
  BEFORE UPDATE ON patient_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_payments_updated_at
  BEFORE UPDATE ON budget_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Fix create_default_categories
DROP FUNCTION IF EXISTS create_default_categories(uuid);

CREATE OR REPLACE FUNCTION create_default_categories(user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, color)
  VALUES
    (user_id, 'Salary', 'income', '#10B981'),
    (user_id, 'Freelance', 'income', '#3B82F6'),
    (user_id, 'Food', 'expense', '#EF4444'),
    (user_id, 'Transport', 'expense', '#F59E0B'),
    (user_id, 'Entertainment', 'expense', '#8B5CF6'),
    (user_id, 'Healthcare', 'expense', '#EC4899'),
    (user_id, 'Shopping', 'expense', '#6366F1')
  ON CONFLICT DO NOTHING;
END;
$$;
