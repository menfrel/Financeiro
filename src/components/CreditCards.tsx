import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CreditCard, Plus, Search, Trash2, DollarSign } from 'lucide-react';
import CreditCardForm from './CreditCardForm';
import CreditCardTransactionForm from './CreditCardTransactionForm';
import InvoiceHistoryTable from './InvoiceHistoryTable';
import { creditCardService, CreditCardData, CreditCardTransaction, BillingStats } from '../services/creditCardService';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

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
  const [selectedCardData, setSelectedCardData] = useState<CreditCardData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingStats, setBillingStats] = useState<BillingStats>({
    totalPurchases: 0,
    totalPayments: 0,
    previousBalance: 0,
    totalToPay: 0
  });
  const [editingTransaction, setEditingTransaction] = useState<CreditCardTransaction | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCloseInvoiceModal, setShowCloseInvoiceModal] = useState(false);
  const [closingInvoice, setClosingInvoice] = useState(false);
  const [closeInvoiceForm, setCloseInvoiceForm] = useState({
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  // Load initial data
  useEffect(() => {
    if (user) {
      loadCreditCards();
      loadCategories();
    }
  }, [user]);

  // Load transactions and billing stats when card/month changes
  useEffect(() => {
    if (selectedCard) {
      loadTransactions();
      loadBillingStats();
    }
  }, [selectedCard, currentMonth]);

  const loadCreditCards = async () => {
    try {
      setError('');
      const cards = await creditCardService.fetchCreditCards(user?.id || '');
      setCreditCards(cards);
      if (cards.length > 0 && !selectedCard) {
        setSelectedCard(cards[0].id);
        setSelectedCardData(cards[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cartões');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      const cycleStart = formatCycleStart();
      const cycleEnd = formatCycleEnd();
      const txs = await creditCardService.fetchTransactions(
        selectedCard,
        user?.id || '',
        cycleStart,
        cycleEnd
      );
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };

  const loadBillingStats = async () => {
    try {
      const cycleStart = formatCycleStart();
      const cycleEnd = formatCycleEnd();
      const stats = await creditCardService.calculateBillingStats(
        selectedCard,
        user?.id || '',
        cycleStart,
        cycleEnd
      );
      setBillingStats(stats);
    } catch (err) {
      console.error('Error loading billing stats:', err);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta transação?')) return;

    try {
      await creditCardService.deleteTransaction(txId, user?.id || '');
      loadTransactions();
      loadBillingStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar transação');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Tem certeza que deseja deletar este cartão?')) return;

    try {
      await creditCardService.deleteCreditCard(cardId, user?.id || '');
      setCreditCards(creditCards.filter(c => c.id !== cardId));
      if (selectedCard === cardId) {
        const remaining = creditCards.filter(c => c.id !== cardId);
        if (remaining.length > 0) {
          setSelectedCard(remaining[0].id);
        } else {
          setSelectedCard('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar cartão');
    }
  };

  const handleCloseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    setClosingInvoice(true);

    try {
      const paidAmount = parseFloat(closeInvoiceForm.paidAmount || '0');
      const cycleMonth = currentMonth.toISOString().split('T')[0].substring(0, 7);
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close_credit_card_invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credit_card_id: selectedCard,
            cycle_month: cycleMonth,
            paid_amount: paidAmount
          })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao fechar fatura');
      }

      // If payment was made, create payment transaction
      if (paidAmount > 0) {
        await creditCardService.createTransaction(user?.id || '', selectedCard, {
          amount: -paidAmount,
          description: `Pagamento da fatura - ${cycleMonth}`,
          date: closeInvoiceForm.paymentDate,
          installments: 1,
          category_id: undefined
        });
      }

      alert('Fatura fechada com sucesso!');
      setShowCloseInvoiceModal(false);
      setCloseInvoiceForm({ paidAmount: '', paymentDate: new Date().toISOString().split('T')[0] });
      loadTransactions();
      loadBillingStats();
      loadCreditCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fechar fatura');
    } finally {
      setClosingInvoice(false);
    }
  };

  const formatCycleStart = (): string => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const card = creditCards.find(c => c.id === selectedCard);
    if (!card) return '';
    const start = new Date(year, month - 1, card.closing_day + 1);
    return start.toISOString().split('T')[0];
  };

  const formatCycleEnd = (): string => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const card = creditCards.find(c => c.id === selectedCard);
    if (!card) return '';
    const end = new Date(year, month, card.closing_day);
    return end.toISOString().split('T')[0];
  };

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  const handleSelectCard = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(cardId);
      setSelectedCardData(card);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-900 underline">×</button>
        </div>
      )}

      <div className="flex gap-2 border-b">
        {(['cards', 'transactions', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'cards' ? 'Cartões' : tab === 'transactions' ? 'Transações' : 'Histórico'}
          </button>
        ))}
      </div>

      {activeTab === 'cards' && (
        <div className="space-y-6">
          <CreditCardForm onSuccess={loadCreditCards} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {creditCards.map(card => (
              <div
                key={card.id}
                onClick={() => handleSelectCard(card.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedCard === card.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{card.name}</h3>
                    <p className="text-sm text-gray-500">Limite: {formatCurrency(card.limit_amount)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCard(card.id);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo:</span>
                    <span className="font-semibold">{formatCurrency(card.current_balance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fechamento: {card.closing_day}</span>
                    <span className="text-gray-600">Vencimento: {card.due_day}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && selectedCardData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">{selectedCardData.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ←
                </button>
                <span className="px-4 py-2 bg-gray-100 rounded-lg">
                  {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Compras</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(billingStats.totalPurchases)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Pagamentos</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(billingStats.totalPayments)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Saldo Anterior</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(billingStats.previousBalance)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(billingStats.totalToPay)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCloseInvoiceForm({
                    paidAmount: billingStats.totalToPay.toString(),
                    paymentDate: new Date().toISOString().split('T')[0]
                  });
                  setShowCloseInvoiceModal(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Fechar Fatura
              </button>
              <button
                onClick={() => setShowTransactionForm(true)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Transação
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pesquisar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhuma transação encontrada</p>
              ) : (
                filteredTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.date}</p>
                      {tx.installments > 1 && (
                        <p className="text-xs text-gray-400">{tx.current_installment}/{tx.installments}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="ml-4 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {showTransactionForm && (
            <CreditCardTransactionForm
              cardId={selectedCard}
              categories={categories}
              editing={editingTransaction}
              onSuccess={() => {
                loadTransactions();
                loadBillingStats();
                setEditingTransaction(null);
              }}
              onCancel={() => {
                setShowTransactionForm(false);
                setEditingTransaction(null);
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'history' && selectedCardData && (
        <InvoiceHistoryTable creditCardId={selectedCard} userId={user?.id || ''} />
      )}

      {showCloseInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Fechar Fatura</h2>
              <form onSubmit={handleCloseInvoice} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total da Fatura:</span>
                    <span className="font-semibold text-blue-900">{formatCurrency(billingStats.totalToPay)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pago</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeInvoiceForm.paidAmount}
                    onChange={(e) => setCloseInvoiceForm({ ...closeInvoiceForm, paidAmount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    value={closeInvoiceForm.paymentDate}
                    onChange={(e) => setCloseInvoiceForm({ ...closeInvoiceForm, paymentDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCloseInvoiceModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={closingInvoice}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    disabled={closingInvoice}
                  >
                    {closingInvoice ? 'Fechando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
