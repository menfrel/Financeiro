/*
  # Create default categories for new users

  1. New Function
    - `create_default_categories()` - Creates default income and expense categories for new users
  
  2. Trigger
    - Automatically creates default categories when a new user is created
*/

-- Create function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS trigger AS $$
BEGIN
  -- Create default income categories
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (NEW.id, 'Salário', 'income', '#10B981'),
    (NEW.id, 'Freelance', 'income', '#059669'),
    (NEW.id, 'Investimentos', 'income', '#047857'),
    (NEW.id, 'Outros', 'income', '#065F46');

  -- Create default expense categories
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (NEW.id, 'Alimentação', 'expense', '#EF4444'),
    (NEW.id, 'Transporte', 'expense', '#F97316'),
    (NEW.id, 'Moradia', 'expense', '#F59E0B'),
    (NEW.id, 'Saúde', 'expense', '#84CC16'),
    (NEW.id, 'Educação', 'expense', '#06B6D4'),
    (NEW.id, 'Lazer', 'expense', '#8B5CF6'),
    (NEW.id, 'Compras', 'expense', '#EC4899'),
    (NEW.id, 'Contas', 'expense', '#6B7280');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default categories for new users
DROP TRIGGER IF EXISTS on_user_created_categories ON public.users;
CREATE TRIGGER on_user_created_categories
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();