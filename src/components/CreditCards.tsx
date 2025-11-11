import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CreditCard, Plus, Search, CreditCard as Edit, Trash2, ChevronUp, DollarSign, TrendingUp } from 'lucide-react';
import CreditCardChart from './CreditCardChart';
import InvoiceHistoryTable from './InvoiceHistoryTable';

// Utility function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

interface CreditCardData {
  id: string;
  name: string;
  limit_amount: number;
  current_balance: number;
  closing_day: number;
  due_day: number;
  created_at: string;
}

interface CreditCardTransaction {
  id: string;
  credit_card_id: string;
  amount: number;
  description: string;
  date: string;
  installments: number;
  current_installment: number;
  category_id: string;
  categories?: {
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
}

export default function CreditCards() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'cards' | 'transactions' | 'history'>('cards');
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CreditCardTransaction | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancingTransaction, setAdvancingTransaction] = useState<CreditCardTransaction | null>(null);
  const [advanceInstallments, setAdvanceInstallments] = useState(1);
	const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [cardForm, setCardForm] = useState({
    name: '',
    limit_amount: '',
    closing_day: '',
    due_day: ''
  });

  const [transactionForm, setTransactionForm] = useState({
    credit_card_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    installments: '1',
    category_id: ''
  });

	const [paymentForm, setPaymentForm] = useState({
		credit_card_id: '',
		amount: '',
		description: 'Pagamento',
		date: new Date().toISOString().split('T')[0]
	});

	const [closingInvoice, setClosingInvoice] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCreditCards();
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCard) {
      fetchTransactions();
    }
  }, [selectedCard, currentMonth]);

  const fetchCreditCards = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreditCards(data || []);
      if (data && data.length > 0 && !selectedCard) {
        setSelectedCard(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedCard) return;

    try {
      const card = creditCards.find(c => c.id === selectedCard);
      if (!card) return;

      // Calculate billing cycle dates
      const { startDate, endDate } = getBillingCycleDates(currentMonth, card.closing_day);

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user?.id)
        .eq('credit_card_id', selectedCard)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getBillingCycleDates = (month: Date, closingDay: number) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Start date: closing day of previous month + 1
    const startDate = new Date(year, monthIndex - 1, closingDay + 1);
    
    // End date: closing day of current month
    const endDate = new Date(year, monthIndex, closingDay);
    
    return { startDate, endDate };
  };

  const formatBillingPeriod = (month: Date, closingDay: number) => {
    const { startDate, endDate } = getBillingCycleDates(month, closingDay);
    
    const formatDate = (date: Date) => {
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getDueDate = (month: Date, dueDay: number) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Due date is in the same month as the billing cycle end
    const dueDate = new Date(year, monthIndex, dueDay);
    
    return dueDate.toLocaleDateString('pt-BR');
  };

  // Calculate billing stats from invoices and current transactions
  const calculateBillingStatsFromInvoice = async (cardId: string, month: Date, closingDay: number) => {
    try {
      const year = month.getFullYear();
      const monthIndex = month.getMonth();

      // Calculate cycle dates for the current month being viewed
      const cycleStart = new Date(year, monthIndex - 1, closingDay + 1);
      const cycleEnd = new Date(year, monthIndex, closingDay);
      const cycleStartStr = cycleStart.toISOString().split('T')[0];
      const cycleEndStr = cycleEnd.toISOString().split('T')[0];

      // Try to get existing invoice for this cycle
      const { data: invoice, error: invoiceError } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('user_id', user?.id)
        .eq('cycle_start', cycleStartStr)
        .eq('cycle_end', cycleEndStr)
        .maybeSingle();

      if (invoiceError) throw invoiceError;

      if (invoice) {
        // Use invoice data if it exists
        return {
          currentBill: Number(invoice.purchases_total),
          currentPayments: Number(invoice.payments_total),
          previousDebt: Number(invoice.previous_balance),
          totalToPay: Math.max(0, Number(invoice.total_due) - Number(invoice.paid_amount || 0))
        };
      }

      // Calculate from transactions if no invoice exists yet
      const { data: purchases, error: purchasesError } = await supabase
        .from('credit_card_transactions')
        .select('amount')
        .eq('credit_card_id', cardId)
        .eq('user_id', user?.id)
        .gte('date', cycleStartStr)
        .lte('date', cycleEndStr)
        .gt('amount', 0);

      if (purchasesError) throw purchasesError;

      const { data: payments, error: paymentsError } = await supabase
        .from('credit_card_transactions')
        .select('amount')
        .eq('credit_card_id', cardId)
        .eq('user_id', user?.id)
        .gte('date', cycleStartStr)
        .lte('date', cycleEndStr)
        .lt('amount', 0);

      if (paymentsError) throw paymentsError;

      const currentBill = (purchases || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const currentPayments = Math.abs((payments || []).reduce((sum, t) => sum + Number(t.amount), 0));

      // Get the most recent closed invoice that ended before the current cycle ends
      // This ensures we get the immediately previous billing period
      const { data: previousInvoice, error: prevError } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('user_id', user?.id)
        .lt('cycle_end', cycleEndStr)
        .order('cycle_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevError) throw prevError;

      // Previous debt is the unpaid amount from the last invoice
      const previousDebt = previousInvoice
        ? Math.max(0, Number(previousInvoice.total_due) - Number(previousInvoice.paid_amount || 0))
        : 0;

      // Total to pay = current purchases + previous debt - payments made this cycle
      const totalToPay = Math.max(0, currentBill + previousDebt - currentPayments);

      return {
        currentBill,
        currentPayments,
        previousDebt,
        totalToPay
      };
    } catch (error) {
      console.error('Error calculating billing stats:', error);
      return {
        currentBill: 0,
        currentPayments: 0,
        previousDebt: 0,
        totalToPay: 0
      };
    }
  };

  // Recalculate card balance based on all transactions
  const recalculateCardBalance = async (cardId: string) => {
    try {
      const card = creditCards.find(c => c.id === cardId);
      if (!card) return;

      // Get all transactions for this card
      const { data: allTransactions, error } = await supabase
        .from('credit_card_transactions')
        .select('amount')
        .eq('credit_card_id', cardId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Calculate total balance (all purchases - all payments)
      const totalBalance = (allTransactions || []).reduce((sum, t) => sum + Number(t.amount), 0);

      // Update card balance
      const { error: updateError } = await supabase
        .from('credit_cards')
        .update({ current_balance: Math.max(0, totalBalance) })
        .eq('id', cardId)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Refresh cards list
      await fetchCreditCards();
    } catch (error) {
      console.error('Error recalculating card balance:', error);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Verificar se estamos editando ou criando
      const isEditing = creditCards.some(card => card.name === cardForm.name && card.id);
      
      if (isEditing) {
        // Encontrar o cartão sendo editado
        const editingCard = creditCards.find(card => card.name === cardForm.name);
        if (editingCard) {
          const { error } = await supabase
            .from('credit_cards')
            .update({
              name: cardForm.name,
              limit_amount: parseFloat(cardForm.limit_amount),
              closing_day: parseInt(cardForm.closing_day),
              due_day: parseInt(cardForm.due_day)
            })
            .eq('id', editingCard.id)
            .eq('user_id', user?.id);

          if (error) throw error;
        }
      } else {
        // Criar novo cartão
        const { error } = await supabase
          .from('credit_cards')
          .insert({
            user_id: user?.id,
            name: cardForm.name,
            limit_amount: parseFloat(cardForm.limit_amount),
            closing_day: parseInt(cardForm.closing_day),
            due_day: parseInt(cardForm.due_day)
          });

        if (error) throw error;
      }

      setCardForm({ name: '', limit_amount: '', closing_day: '', due_day: '' });
      setShowCardForm(false);
      fetchCreditCards();
      alert(isEditing ? 'Cartão atualizado com sucesso!' : 'Cartão criado com sucesso!');
    } catch (error) {
      console.error('Error creating credit card:', error);
      alert('Erro ao salvar cartão');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amount = parseFloat(transactionForm.amount);
      const installments = parseInt(transactionForm.installments);

      // Create transactions for each installment
      const transactions = [];
      for (let i = 1; i <= installments; i++) {
        const installmentDate = new Date(transactionForm.date);
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

        transactions.push({
          user_id: user?.id,
          credit_card_id: transactionForm.credit_card_id,
          amount: amount / installments,
          description: installments > 1 ? `${transactionForm.description} (${i}/${installments})` : transactionForm.description,
          date: installmentDate.toISOString().split('T')[0],
          installments,
          current_installment: i,
          category_id: transactionForm.category_id || null
        });
      }

      const { error } = await supabase
        .from('credit_card_transactions')
        .insert(transactions);

      if (error) throw error;

      // Recalculate card balance
      await recalculateCardBalance(transactionForm.credit_card_id);

      setTransactionForm({
        credit_card_id: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        installments: '1',
        category_id: ''
      });
      setShowTransactionForm(false);
      fetchCreditCards();
      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('credit_card_transactions')
        .update({
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description,
          date: transactionForm.date,
          category_id: transactionForm.category_id || null
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      setEditingTransaction(null);
      setShowTransactionForm(false);
      await recalculateCardBalance(editingTransaction.credit_card_id);
      fetchTransactions();
      fetchCreditCards();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleAdvanceInstallments = async () => {
    if (!advancingTransaction) return;

    try {
      // Calculate remaining installments
      const remainingInstallments = advancingTransaction.installments - advancingTransaction.current_installment;
      const installmentsToAdvance = Math.min(advanceInstallments, remainingInstallments);
      
      if (installmentsToAdvance <= 0) return;

      // Get all future installments of this transaction
      const { data: futureInstallments, error: fetchError } = await supabase
        .from('credit_card_transactions')
        .select('*')
        .eq('description', advancingTransaction.description.split(' (')[0])
        .eq('credit_card_id', advancingTransaction.credit_card_id)
        .gt('current_installment', advancingTransaction.current_installment)
        .order('current_installment')
        .limit(installmentsToAdvance);

      if (fetchError) throw fetchError;

      // Update the dates of future installments to current month
      const currentDate = new Date().toISOString().split('T')[0];
      const updates = futureInstallments?.map(installment => ({
        id: installment.id,
        date: currentDate
      })) || [];

      for (const update of updates) {
        const { error } = await supabase
          .from('credit_card_transactions')
          .update({ date: update.date })
          .eq('id', update.id);

        if (error) throw error;
      }

      setShowAdvanceModal(false);
      setAdvancingTransaction(null);
      setAdvanceInstallments(1);
      fetchTransactions();
    } catch (error) {
      console.error('Error advancing installments:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const { error } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Get transaction to know which card to recalculate
      const deletedTransaction = transactions.find(t => t.id === transactionId);
      if (deletedTransaction) {
        await recalculateCardBalance(deletedTransaction.credit_card_id);
      }

      fetchTransactions();
      fetchCreditCards();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

	const handleCreatePayment = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const amount = Math.abs(parseFloat(paymentForm.amount || '0'));
			if (!amount) return;

			const { error } = await supabase
				.from('credit_card_transactions')
				.insert({
					user_id: user?.id,
					credit_card_id: paymentForm.credit_card_id || selectedCard,
					amount: -amount,
					description: paymentForm.description,
					date: paymentForm.date,
					installments: 1,
					current_installment: 1,
					category_id: null
				});

			if (error) throw error;

			// Recalculate card balance
			await recalculateCardBalance(paymentForm.credit_card_id || selectedCard);

			setShowPaymentForm(false);
			setPaymentForm({ credit_card_id: '', amount: '', description: 'Pagamento', date: new Date().toISOString().split('T')[0] });
			fetchTransactions();
			fetchCreditCards();
		} catch (error) {
			console.error('Error creating payment:', error);
			alert('Não foi possível registrar o pagamento. Verifique o valor e tente novamente.');
		}
	};

	const handleCloseInvoice = async () => {
		if (!selectedCard) return;
		setClosingInvoice(true);

		try {
			const cycleMonth = currentMonth.toISOString().split('T')[0].substring(0, 7);
			const response = await fetch(
				`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close_credit_card_invoice`,
				{
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						credit_card_id: selectedCard,
						cycle_month: cycleMonth
					})
				}
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Erro ao fechar fatura');
			}

			const result = await response.json();
			alert('Fatura fechada com sucesso!');
			fetchTransactions();
			fetchCreditCards();
		} catch (error) {
			console.error('Error closing invoice:', error);
			alert(`Erro ao fechar fatura: ${error instanceof Error ? error.message : 'Desconhecido'}`);
		} finally {
			setClosingInvoice(false);
		}
	};

  const openEditModal = (transaction: CreditCardTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      credit_card_id: transaction.credit_card_id,
      amount: transaction.amount.toString(),
      description: transaction.description.split(' (')[0], // Remove installment info
      date: transaction.date,
      installments: transaction.installments.toString(),
      category_id: transaction.category_id || ''
    });
    setShowTransactionForm(true);
  };

  const openAdvanceModal = (transaction: CreditCardTransaction) => {
    setAdvancingTransaction(transaction);
    setAdvanceInstallments(1);
    setShowAdvanceModal(true);
  };

  const handleEditCard = (card: CreditCardData) => {
    setCardForm({
      name: card.name,
      limit_amount: card.limit_amount.toString(),
      closing_day: card.closing_day.toString(),
      due_day: card.due_day.toString()
    });
    setShowCardForm(true);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão? Todas as transações associadas também serão excluídas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Se o cartão excluído era o selecionado, selecionar outro
      if (selectedCard === cardId) {
        const remainingCards = creditCards.filter(c => c.id !== cardId);
        setSelectedCard(remainingCards.length > 0 ? remainingCards[0].id : '');
      }

      fetchCreditCards();
      alert('Cartão excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting credit card:', error);
      alert('Erro ao excluir cartão');
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCardData = creditCards.find(card => card.id === selectedCard);
  
  // Calculate billing statistics
  const [billingStats, setBillingStats] = useState({
    currentBill: 0,
    currentPayments: 0,
    previousDebt: 0,
    totalToPay: 0
  });

  useEffect(() => {
    const calculateBillingStats = async () => {
      if (!selectedCard || !creditCards.length) return;

      const card = creditCards.find(c => c.id === selectedCard);
      if (!card) return;

      const stats = await calculateBillingStatsFromInvoice(selectedCard, currentMonth, card.closing_day);
      setBillingStats(stats);
    };

    if (selectedCard) {
      calculateBillingStats();
    }
  }, [selectedCard, currentMonth, transactions, creditCards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-gray-600 mt-2">Gerencie seus cartões e faturas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowTransactionForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Nova Compra
          </button>
          <button
            onClick={() => {
              setPaymentForm(p => ({
                ...p,
                credit_card_id: selectedCard || (creditCards[0]?.id || ''),
                date: new Date().toISOString().split('T')[0]
              }));
              setShowPaymentForm(true);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Pagamento
          </button>
          <button
            onClick={() => setShowCardForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Cartão
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cards')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cartões
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transações
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Histórico
          </button>
        </nav>
      </div>

      {activeTab === 'cards' && (
        <>
          {creditCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum cartão encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Cadastre seu primeiro cartão de crédito para começar
              </p>
              <button
                onClick={() => setShowCardForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Cadastrar Cartão
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creditCards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{card.name}</h3>
                        <p className="text-sm text-gray-500">
                          Fecha dia {card.closing_day} • Vence dia {card.due_day}
                        </p>
                      </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar cartão"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir cartão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Limite</span>
                      <span className="font-medium">
                        {formatCurrency(card.limit_amount)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Disponível</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(card.limit_amount - card.current_balance)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Utilização</span>
                      <span className={`font-medium ${
                        (card.current_balance / card.limit_amount) * 100 >= 80 ? 'text-red-600' :
                        (card.current_balance / card.limit_amount) * 100 >= 60 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {((card.current_balance / card.limit_amount) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (card.current_balance / card.limit_amount) * 100 >= 80 ? 'bg-red-500' :
                          (card.current_balance / card.limit_amount) * 100 >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((card.current_balance / card.limit_amount) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Pagamento de Fatura</h2>
              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cartão</label>
                  <select
                    required
                    value={paymentForm.credit_card_id || selectedCard}
                    onChange={(e) => setPaymentForm({ ...paymentForm, credit_card_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Pagamento da fatura"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Registrar Pagamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Card Selector */}
          {creditCards.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Cartão
              </label>
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCardData && (
            <>
              {/* Month Navigation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ←
                  </button>
                  <div className="text-center flex-1">
                    <h2 className="text-xl font-semibold">
                      {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Período: {formatBillingPeriod(currentMonth, selectedCardData.closing_day)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Vencimento: {getDueDate(currentMonth, selectedCardData.due_day)}
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={handleCloseInvoice}
                  disabled={closingInvoice}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  {closingInvoice ? 'Fechando...' : 'Fechar Fatura'}
                </button>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fatura do Período</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {formatCurrency(billingStats.currentBill)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pagamentos</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(billingStats.currentPayments)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Saldo Anterior</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {formatCurrency(billingStats.previousDebt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total a Pagar</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(billingStats.totalToPay)}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Search */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar transações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
                  const isPayment = transaction.amount < 0;
                  const displayAmount = Math.abs(transaction.amount);

                  return (
                    <div key={transaction.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isPayment ? 'bg-green-100' : 'bg-purple-100'
                          }`}>
                            <CreditCard className={`w-5 h-5 ${
                              isPayment ? 'text-green-600' : 'text-purple-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 truncate">
                                {transaction.description}
                              </h3>
                              {isPayment && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Pagamento
                                </span>
                              )}
                              {!isPayment && transaction.installments > 1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Parcelado
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500">
                              <span>{new Date(transaction.date).toLocaleDateString('pt-BR')}</span>
                              {transaction.installments > 1 && !isPayment && (
                                <span>• Parcela {transaction.current_installment}/{transaction.installments}</span>
                              )}
                              {transaction.categories && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: transaction.categories.color }}
                                  ></div>
                                  <span>{transaction.categories.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-4">
                          <span className={`text-lg font-semibold ${
                            isPayment ? 'text-green-600' : 'text-purple-600'
                          }`}>
                            {isPayment ? '- ' : ''}R$ {displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>

                          {!isPayment && (
                            <div className="flex items-center gap-2">
                              {transaction.installments > 1 && transaction.current_installment < transaction.installments && (
                                <button
                                  onClick={() => openAdvanceModal(transaction)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Antecipar parcelas"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(transaction)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {isPayment && (
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma transação encontrada</h3>
                    <p className="text-gray-500">
                      {searchTerm ? 'Tente ajustar sua busca' : 'Adicione uma nova compra para começar'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && selectedCardData && (
        <div className="space-y-4">
          {/* Card Selector */}
          {creditCards.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Cartão
              </label>
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chart */}
          <CreditCardChart
            creditCardId={selectedCard}
            userId={user?.id || ''}
            closingDay={selectedCardData.closing_day}
          />

          {/* Invoice History Table */}
          <InvoiceHistoryTable
            creditCardId={selectedCard}
            userId={user?.id || ''}
          />
        </div>
      )}

      {/* Card Form Modal */}
      {showCardForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Novo Cartão de Crédito</h2>
              <form onSubmit={handleCreateCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cartão
                  </label>
                  <input
                    type="text"
                    required
                    value={cardForm.name}
                    onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Nubank, Itaú..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={cardForm.limit_amount}
                    onChange={(e) => setCardForm({ ...cardForm, limit_amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dia de Fechamento
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={cardForm.closing_day}
                      onChange={(e) => setCardForm({ ...cardForm, closing_day: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dia de Vencimento
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={cardForm.due_day}
                      onChange={(e) => setCardForm({ ...cardForm, due_day: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCardForm(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Criar Cartão
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingTransaction ? 'Editar Transação' : 'Nova Compra'}
              </h2>
              <form onSubmit={editingTransaction ? handleEditTransaction : handleCreateTransaction} className="space-y-4">
                {!editingTransaction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cartão
                    </label>
                    <select
                      required
                      value={transactionForm.credit_card_id}
                      onChange={(e) => setTransactionForm({ ...transactionForm, credit_card_id: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um cartão</option>
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Compra no supermercado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={transactionForm.category_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingTransaction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parcelas
                    </label>
                    <select
                      value={transactionForm.installments}
                      onChange={(e) => setTransactionForm({ ...transactionForm, installments: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}x {num > 1 && `de R$ ${(parseFloat(transactionForm.amount || '0') / num).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransactionForm(false);
                      setEditingTransaction(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingTransaction ? 'Salvar' : 'Criar Compra'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Advance Installments Modal */}
      {showAdvanceModal && advancingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Antecipar Parcelas</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900">{advancingTransaction.description}</h3>
                  <p className="text-sm text-gray-600">
                    Parcela {advancingTransaction.current_installment} de {advancingTransaction.installments}
                  </p>
                  <p className="text-sm text-gray-600">
                    Restam {advancingTransaction.installments - advancingTransaction.current_installment} parcelas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantas parcelas antecipar?
                  </label>
                  <select
                    value={advanceInstallments}
                    onChange={(e) => setAdvanceInstallments(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: advancingTransaction.installments - advancingTransaction.current_installment }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} parcela{num > 1 ? 's' : ''} - R$ {(advancingTransaction.amount * num).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Atenção:</strong> As parcelas antecipadas serão movidas para o mês atual e aparecerão na próxima fatura.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvanceModal(false);
                      setAdvancingTransaction(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAdvanceInstallments}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Antecipar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}