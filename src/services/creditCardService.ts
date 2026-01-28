import { supabase } from '../lib/supabase';

export interface CreditCardData {
  id: string;
  name: string;
  limit_amount: number;
  current_balance: number;
  closing_day: number;
  due_day: number;
  created_at: string;
  updated_at: string;
}

export interface CreditCardTransaction {
  id: string;
  user_id: string;
  credit_card_id: string;
  amount: number;
  description: string;
  date: string;
  installments: number;
  current_installment: number;
  category_id: string | null;
  created_at: string;
  categories?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface CreditCardInvoice {
  id: string;
  user_id: string;
  credit_card_id: string;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  purchases_total: number;
  payments_total: number;
  previous_balance: number;
  total_due: number;
  paid_amount: number;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  created_at: string;
  updated_at: string;
}

export interface BillingStats {
  totalPurchases: number;
  totalPayments: number;
  previousBalance: number;
  totalToPay: number;
}

class CreditCardService {
  /**
   * Fetch all credit cards for user
   */
  async fetchCreditCards(userId: string): Promise<CreditCardData[]> {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create new credit card
   */
  async createCreditCard(userId: string, cardData: {
    name: string;
    limit_amount: number;
    closing_day: number;
    due_day: number;
  }): Promise<CreditCardData> {
    // Validate input
    if (!cardData.name || cardData.name.length < 1 || cardData.name.length > 100) {
      throw new Error('Nome do cartão deve ter entre 1 e 100 caracteres');
    }
    if (cardData.limit_amount <= 0) {
      throw new Error('Limite deve ser maior que 0');
    }
    if (cardData.closing_day < 1 || cardData.closing_day > 31) {
      throw new Error('Dia de fechamento deve estar entre 1 e 31');
    }
    if (cardData.due_day < 1 || cardData.due_day > 31) {
      throw new Error('Dia de vencimento deve estar entre 1 e 31');
    }

    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: userId,
        name: cardData.name,
        limit_amount: cardData.limit_amount,
        closing_day: cardData.closing_day,
        due_day: cardData.due_day,
        current_balance: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update credit card
   */
  async updateCreditCard(
    cardId: string,
    userId: string,
    updates: Partial<CreditCardData>
  ): Promise<CreditCardData> {
    const { data, error } = await supabase
      .from('credit_cards')
      .update(updates)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete credit card
   */
  async deleteCreditCard(cardId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Fetch transactions for a card and date range
   */
  async fetchTransactions(
    cardId: string,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CreditCardTransaction[]> {
    let query = supabase
      .from('credit_card_transactions')
      .select('*, categories(id, name, color)')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create transaction (purchase or payment)
   */
  async createTransaction(userId: string, cardId: string, txData: {
    amount: number;
    description: string;
    date: string;
    installments?: number;
    category_id?: string;
  }): Promise<CreditCardTransaction> {
    // Validate input
    if (txData.amount === 0) {
      throw new Error('Valor da transação não pode ser zero');
    }
    if (!txData.description || txData.description.length < 1) {
      throw new Error('Descrição é obrigatória');
    }
    if (txData.installments && (txData.installments < 1 || txData.installments > 24)) {
      throw new Error('Parcelas deve estar entre 1 e 24');
    }

    const { data, error } = await supabase
      .from('credit_card_transactions')
      .insert({
        user_id: userId,
        credit_card_id: cardId,
        amount: txData.amount,
        description: txData.description,
        date: txData.date,
        installments: txData.installments || 1,
        current_installment: 1,
        category_id: txData.category_id || null
      })
      .select('*, categories(id, name, color)')
      .single();

    if (error) throw error;

    // Recalculate card balance
    await this.recalculateCardBalance(cardId, userId);

    return data;
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    txId: string,
    userId: string,
    updates: Partial<CreditCardTransaction>
  ): Promise<CreditCardTransaction> {
    const { data, error } = await supabase
      .from('credit_card_transactions')
      .update(updates)
      .eq('id', txId)
      .eq('user_id', userId)
      .select('*, categories(id, name, color)')
      .single();

    if (error) throw error;

    // Recalculate card balance after update
    if (data.credit_card_id) {
      await this.recalculateCardBalance(data.credit_card_id, userId);
    }

    return data;
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(txId: string, userId: string): Promise<void> {
    // Get transaction to find card_id before deleting
    const { data: tx, error: fetchError } = await supabase
      .from('credit_card_transactions')
      .select('credit_card_id')
      .eq('id', txId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete transaction
    const { error: deleteError } = await supabase
      .from('credit_card_transactions')
      .delete()
      .eq('id', txId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Recalculate card balance after deletion
    if (tx?.credit_card_id) {
      await this.recalculateCardBalance(tx.credit_card_id, userId);
    }
  }

  /**
   * Calculate billing stats for a specific period
   * Formula: total_to_pay = purchases + previous_balance - payments
   */
  async calculateBillingStats(
    cardId: string,
    userId: string,
    cycleStart: string,
    cycleEnd: string
  ): Promise<BillingStats> {
    // Get transactions in period
    const { data: purchases, error: purchasesError } = await supabase
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId)
      .gte('date', cycleStart)
      .lte('date', cycleEnd)
      .gt('amount', 0);

    if (purchasesError) throw purchasesError;

    const { data: payments, error: paymentsError } = await supabase
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId)
      .gte('date', cycleStart)
      .lte('date', cycleEnd)
      .lt('amount', 0);

    if (paymentsError) throw paymentsError;

    // Calculate totals
    const totalPurchases = (purchases || []).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPayments = Math.abs((payments || []).reduce((sum, t) => sum + Number(t.amount), 0));

    // Get previous balance from last invoice
    const { data: previousInvoice, error: prevError } = await supabase
      .from('credit_card_invoices')
      .select('total_due, paid_amount')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId)
      .lt('cycle_end', cycleEnd)
      .order('cycle_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevError) throw prevError;

    const previousBalance = previousInvoice
      ? Math.max(0, Number(previousInvoice.total_due) - Number(previousInvoice.paid_amount || 0))
      : 0;

    const totalToPay = Math.max(0, totalPurchases + previousBalance - totalPayments);

    return {
      totalPurchases,
      totalPayments,
      previousBalance,
      totalToPay
    };
  }

  /**
   * Recalculate card current_balance from all transactions
   * current_balance = sum(purchases) - sum(payments)
   */
  async recalculateCardBalance(cardId: string, userId: string): Promise<void> {
    const { data: purchases, error: purchasesError } = await supabase
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId)
      .gt('amount', 0);

    if (purchasesError) throw purchasesError;

    const { data: payments, error: paymentsError } = await supabase
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId)
      .lt('amount', 0);

    if (paymentsError) throw paymentsError;

    const totalPurchases = (purchases || []).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPayments = Math.abs((payments || []).reduce((sum, t) => sum + Number(t.amount), 0));
    const balance = totalPurchases - totalPayments;

    await supabase
      .from('credit_cards')
      .update({ current_balance: Math.max(0, balance) })
      .eq('id', cardId)
      .eq('user_id', userId);
  }

  /**
   * Fetch invoices for a card
   */
  async fetchInvoices(
    cardId: string,
    userId: string,
    limit = 12
  ): Promise<CreditCardInvoice[]> {
    const { data, error } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', cardId)
      .eq('user_id', userId)
      .order('cycle_end', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get invoice status based on paid_amount and total_due
   */
  getInvoiceStatus(invoice: CreditCardInvoice): 'pago' | 'pendente' | 'vencido' {
    const outstandingBalance = invoice.total_due - (invoice.paid_amount || 0);

    if (outstandingBalance <= 0) {
      return 'pago';
    }

    const today = new Date().toISOString().split('T')[0];
    if (invoice.due_date < today) {
      return 'vencido';
    }

    return 'pendente';
  }

  /**
   * Get outstanding balance for invoice
   */
  getOutstandingBalance(invoice: CreditCardInvoice): number {
    return Math.max(0, invoice.total_due - (invoice.paid_amount || 0));
  }
}

export const creditCardService = new CreditCardService();
