import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  CreditCard,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, parse, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditCard {
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
  created_at: string;
  category_id?: string;
  categories?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface CreditCardForm {
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
}

interface TransactionForm {
  credit_card_id: string;
  amount: number;
  description: string;
  date: string;
  installments: number;
  category_id: string;
}

interface PaymentForm {
  credit_card_id: string;
  amount: number;
  account_id: string;
  date: string;
}

export function CreditCards() {
  const { user } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<CreditCardTransaction | null>(null);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advancingTransaction, setAdvancingTransaction] = useState<CreditCardTransaction | null>(null);
  const [selectedTransactionMonth, setSelectedTransactionMonth] = useState(new Date());

  const [viewMode, setViewMode] = useState<"cards" | "transactions">("cards");

  const {
    register: registerCard,
    handleSubmit: handleCardSubmit,
    reset: resetCard,
    setValue: setCardValue,
    formState: { errors: cardErrors },
  } = useForm<CreditCardForm>();

  const {
    register: registerTransaction,
    handleSubmit: handleTransactionSubmit,
    reset: resetTransaction,
    formState: { errors: transactionErrors },
  } = useForm<TransactionForm>();

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    setValue,
    formState: { errors: paymentErrors },
  } = useForm<PaymentForm>();

  const {
    register: registerEditTransaction,
    handleSubmit: handleEditTransactionSubmit,
    reset: resetEditTransaction,
    setValue: setEditTransactionValue,
    formState: { errors: editTransactionErrors },
  } = useForm<Omit<TransactionForm, 'credit_card_id'>>();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Carregar cartões de crédito
      const { data: cardsData } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Carregar transações dos cartões
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("credit_card_transactions")
        .select(`
          *,
          credit_cards (name),
          categories (id, name, color)
        `)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (transactionsError) {
        console.error("Error loading credit card transactions:", transactionsError);
      }

      // Carregar contas para pagamento
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      // Carregar categorias
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .order("name", { ascending: true });

      setCreditCards(cardsData || []);
      setTransactions(transactionsData || []);
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onCardSubmit = async (data: CreditCardForm) => {
    try {
      setSubmitting(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      const cardData = {
        user_id: user.id,
        name: data.name,
        limit_amount: data.limit_amount,
        current_balance: 0,
        closing_day: data.closing_day,
        due_day: data.due_day,
      };

      if (editingCard) {
        const { error } = await supabase
          .from("credit_cards")
          .update(cardData)
          .eq("id", editingCard.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("credit_cards")
          .insert(cardData);

        if (error) throw error;
      }

      await loadData();
      setIsCardModalOpen(false);
      setEditingCard(null);
      resetCard();
    } catch (error) {
      console.error("Error saving credit card:", error);
      alert("Erro ao salvar cartão de crédito");
    } finally {
      setSubmitting(false);
    }
  };

  const onTransactionSubmit = async (data: TransactionForm) => {
    try {
      setSubmitting(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      // Criar transações para cada parcela
      const installmentAmount = data.amount / data.installments;
      const baseDate = new Date(data.date);

      for (let i = 0; i < data.installments; i++) {
        const installmentDate = addMonths(baseDate, i);
        
        const { error } = await supabase
          .from("credit_card_transactions")
          .insert({
            user_id: user.id,
            credit_card_id: data.credit_card_id,
            category_id: data.category_id,
            amount: installmentAmount,
            description: data.installments > 1 
              ? `${data.description} (${i + 1}/${data.installments})`
              : data.description,
            date: format(installmentDate, "yyyy-MM-dd"),
            installments: data.installments,
            current_installment: i + 1,
          });

        if (error) throw error;
      }

      // Atualizar saldo do cartão
      const card = creditCards.find(c => c.id === data.credit_card_id);
      if (card) {
        const { error } = await supabase
          .from("credit_cards")
          .update({
            current_balance: card.current_balance + data.amount,
          })
          .eq("id", data.credit_card_id);

        if (error) throw error;
      }

      await loadData();
      setIsTransactionModalOpen(false);
      resetTransaction();
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Erro ao criar transação");
    } finally {
      setSubmitting(false);
    }
  };

  const onPaymentSubmit = async (data: PaymentForm) => {
    try {
      setSubmitting(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      const card = creditCards.find(c => c.id === data.credit_card_id);
      const account = accounts.find(a => a.id === data.account_id);

      if (!card || !account) {
        alert("Cartão ou conta não encontrados");
        return;
      }

      if (account.current_balance < data.amount) {
        alert("Saldo insuficiente na conta");
        return;
      }

      // Criar transação de pagamento
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: data.account_id,
          category_id: (await getPaymentCategoryId()),
          amount: data.amount,
          type: "expense",
          description: `Pagamento ${card.name}`,
          date: data.date,
        });

      if (transactionError) throw transactionError;

      // Atualizar saldo da conta
      const { error: accountError } = await supabase
        .from("accounts")
        .update({
          current_balance: account.current_balance - data.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.account_id);

      if (accountError) throw accountError;

      // Atualizar saldo do cartão
      const { error: cardError } = await supabase
        .from("credit_cards")
        .update({
          current_balance: Math.max(0, card.current_balance - data.amount),
        })
        .eq("id", data.credit_card_id);

      if (cardError) throw cardError;

      await loadData();
      setIsPaymentModalOpen(false);
      resetPayment();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Erro ao processar pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentCategoryId = async () => {
    // Buscar ou criar categoria para pagamentos de cartão
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user!.id)
      .eq("name", "Cartão de Crédito")
      .eq("type", "expense")
      .single();

    if (category) {
      return category.id;
    }

    // Criar categoria se não existir
    const { data: newCategory } = await supabase
      .from("categories")
      .insert({
        user_id: user!.id,
        name: "Cartão de Crédito",
        type: "expense",
        color: "#6366F1",
      })
      .select("id")
      .single();

    return newCategory?.id;
  };

  const handleEditTransaction = (transaction: CreditCardTransaction) => {
    setEditingTransaction(transaction);
    setEditTransactionValue("amount", transaction.amount);
    setEditTransactionValue("description", transaction.description);
    setEditTransactionValue("date", transaction.date);
    setEditTransactionValue("installments", transaction.installments);
    setEditTransactionValue("category_id", transaction.category_id || "");
    setIsEditTransactionModalOpen(true);
  };

  const onEditTransactionSubmit = async (data: Omit<TransactionForm, 'credit_card_id'>) => {
    if (!editingTransaction) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("credit_card_transactions")
        .update({
          amount: data.amount,
          description: data.description,
          date: data.date,
          installments: data.installments,
          category_id: data.category_id,
        })
        .eq("id", editingTransaction.id)
        .eq("user_id", user!.id);

      if (error) throw error;

      await loadData();
      setIsEditTransactionModalOpen(false);
      setEditingTransaction(null);
      resetEditTransaction();
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Erro ao atualizar transação");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Deseja realmente excluir esta transação?")) return;

    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      // Atualizar saldo do cartão
      const card = creditCards.find(c => c.id === transaction.credit_card_id);
      if (card) {
        const { error: cardError } = await supabase
          .from("credit_cards")
          .update({
            current_balance: Math.max(0, card.current_balance - transaction.amount),
          })
          .eq("id", transaction.credit_card_id);

        if (cardError) throw cardError;
      }

      // Excluir transação
      const { error } = await supabase
        .from("credit_card_transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user!.id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Erro ao excluir transação");
    }
  };

  const handleAdvanceInstallment = (transaction: CreditCardTransaction) => {
    setAdvancingTransaction(transaction);
    setIsAdvanceModalOpen(true);
  };

  const processAdvanceInstallment = async () => {
    if (!advancingTransaction) return;

    try {
      setSubmitting(true);

      // Criar nova transação para a próxima parcela
      const nextInstallment = advancingTransaction.current_installment + 1;
      const nextDate = addMonths(new Date(advancingTransaction.date), 1);

      const { error } = await supabase
        .from("credit_card_transactions")
        .insert({
          user_id: user!.id,
          credit_card_id: advancingTransaction.credit_card_id,
          amount: advancingTransaction.amount,
          description: advancingTransaction.description.replace(
            `(${advancingTransaction.current_installment}/${advancingTransaction.installments})`,
            `(${nextInstallment}/${advancingTransaction.installments})`
          ),
          date: format(nextDate, "yyyy-MM-dd"),
          installments: advancingTransaction.installments,
          current_installment: nextInstallment,
        });

      if (error) throw error;

      // Atualizar saldo do cartão
      const card = creditCards.find(c => c.id === advancingTransaction.credit_card_id);
      if (card) {
        const { error: cardError } = await supabase
          .from("credit_cards")
          .update({
            current_balance: card.current_balance + advancingTransaction.amount,
          })
          .eq("id", advancingTransaction.credit_card_id);

        if (cardError) throw cardError;
      }

      await loadData();
      setIsAdvanceModalOpen(false);
      setAdvancingTransaction(null);
    } catch (error) {
      console.error("Error advancing installment:", error);
      alert("Erro ao adiantar parcela");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setCardValue("name", card.name);
    setCardValue("limit_amount", card.limit_amount);
    setCardValue("closing_day", card.closing_day);
    setCardValue("due_day", card.due_day);
    setIsCardModalOpen(true);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Deseja realmente excluir este cartão?")) return;

    try {
      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", user!.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const openCardModal = () => {
    setEditingCard(null);
    resetCard();
    setIsCardModalOpen(true);
  };

  const openTransactionModal = () => {
    resetTransaction();
    setIsTransactionModalOpen(true);
  };

  const openPaymentModal = (cardId?: string) => {
    resetPayment();
    if (cardId) {
      setValue("credit_card_id", cardId);
    }
    setValue("date", format(new Date(), "yyyy-MM-dd"));
    setIsPaymentModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(parse(dateString, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", {
      locale: ptBR,
    });
  };

  const groupTransactionsByMonth = () => {
    // Filtrar transações do mês selecionado
    const monthStart = startOfMonth(selectedTransactionMonth);
    const monthEnd = endOfMonth(selectedTransactionMonth);
    
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    const grouped = filteredTransactions.reduce((acc: any, transaction: any) => {
      const date = new Date(transaction.date);
      const monthKey = format(date, "yyyy-MM");
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: format(date, "MMMM yyyy", { locale: ptBR }),
          monthKey,
          transactions: [],
          total: 0
        };
      }
      
      acc[monthKey].transactions.push(transaction);
      acc[monthKey].total += parseFloat(transaction.amount) || 0;
      
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const getCardStatus = (card: CreditCard) => {
    const usagePercentage = (card.current_balance / card.limit_amount) * 100;
    
    if (usagePercentage >= 90) return { status: "danger", color: "red", text: "Limite quase esgotado" };
    if (usagePercentage >= 70) return { status: "warning", color: "yellow", text: "Uso elevado" };
    return { status: "safe", color: "green", text: "Uso normal" };
  };

  const filteredCards = creditCards.filter((card) =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 sm:mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-gray-600 mt-2">
            Gerencie seus cartões e faturas
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Cartões
            </button>
            <button
              onClick={() => setViewMode("transactions")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "transactions"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Transações
            </button>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={openTransactionModal}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
            >
              <DollarSign className="w-4 h-4" />
              <span>Nova Compra</span>
            </button>
            <button
              onClick={openCardModal}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cartão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cartões..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "cards" ? (
        /* Cards Grid */
        filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "Nenhum cartão encontrado" : "Nenhum cartão cadastrado"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? "Tente ajustar o termo de busca" 
                : "Cadastre seu primeiro cartão de crédito"
              }
            </p>
            <button
              onClick={openCardModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Cadastrar Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCards.map((card) => {
              const status = getCardStatus(card);
              const usagePercentage = (card.current_balance / card.limit_amount) * 100;
              
              return (
                <div
                  key={card.id}
                  className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{card.name}</h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          status.color === 'red' ? 'bg-red-100 text-red-800' :
                          status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {status.text}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {/* Saldo Atual */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs sm:text-sm text-gray-600">Fatura Atual</span>
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">
                          {formatCurrency(card.current_balance)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            status.color === 'red' ? 'bg-red-500' :
                            status.color === 'yellow' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{usagePercentage.toFixed(1)}% usado</span>
                        <span>Limite: {formatCurrency(card.limit_amount)}</span>
                      </div>
                    </div>

                    {/* Informações do Cartão */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">Fechamento</span>
                        <p className="font-medium">Dia {card.closing_day}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Vencimento</span>
                        <p className="font-medium">Dia {card.due_day}</p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => openPaymentModal(card.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                      >
                        Pagar Fatura
                      </button>
                      <button
                        onClick={() => openTransactionModal()}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                      >
                        Nova Compra
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Transactions View */
        <div className="space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => setSelectedTransactionMonth(subMonths(selectedTransactionMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {format(selectedTransactionMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Transações do mês
              </p>
            </div>

            <button
              onClick={() => setSelectedTransactionMonth(addMonths(selectedTransactionMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Registre sua primeira compra no cartão
              </p>
              <button
                onClick={openTransactionModal}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Nova Compra
              </button>
            </div>
          ) : (
            groupTransactionsByMonth().length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma transação neste mês
                </h3>
                <p className="text-gray-600 mb-6">
                  Não há transações em {format(selectedTransactionMonth, 'MMMM yyyy', { locale: ptBR })}
                </p>
              </div>
            ) : (
              groupTransactionsByMonth().map((monthGroup: any, index: number) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Month Header */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold capitalize">{monthGroup.month}</h3>
                      <p className="text-purple-100 mt-1">
                        {monthGroup.transactions.length} transação(ões)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(monthGroup.total)}</p>
                      <p className="text-purple-100 text-sm">Total do mês</p>
                    </div>
                  </div>
                </div>

                {/* Transactions List */}
                <div className="divide-y divide-gray-100">
                  {monthGroup.transactions.map((transaction: any) => (
                    <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {transaction.description}
                              </h4>
                              {transaction.installments > 1 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {transaction.current_installment} de {transaction.installments}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(transaction.date)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CreditCard className="w-4 h-4" />
                                <span>{transaction.credit_cards?.name || 'Cartão'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(transaction.amount)}
                                </span>
                              </div>
                              {transaction.categories && (
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: transaction.categories.color }}
                                  />
                                  <span>{transaction.categories.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            {transaction.installments > 1 && transaction.current_installment >= 2 && (
                              <button
                                onClick={() => handleAdvanceInstallment(transaction)}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                              >
                                <TrendingUp className="w-4 h-4" />
                                <span>Adiantar</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              ))
            )
          )}
        </div>
      )}

      {/* Modal Novo Cartão */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingCard ? "Editar Cartão" : "Novo Cartão"}
            </h2>

            <form onSubmit={handleCardSubmit(onCardSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cartão
                </label>
                <input
                  {...registerCard("name", { required: "Nome é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Nubank, Itaú, etc."
                />
                {cardErrors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {cardErrors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite
                </label>
                <input
                  {...registerCard("limit_amount", {
                    required: "Limite é obrigatório",
                    valueAsNumber: true,
                    min: { value: 1, message: "Limite deve ser maior que zero" },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {cardErrors.limit_amount && (
                  <p className="text-red-600 text-sm mt-1">
                    {cardErrors.limit_amount.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dia do Fechamento
                  </label>
                  <input
                    {...registerCard("closing_day", {
                      required: "Dia do fechamento é obrigatório",
                      valueAsNumber: true,
                      min: { value: 1, message: "Dia deve ser entre 1 e 31" },
                      max: { value: 31, message: "Dia deve ser entre 1 e 31" },
                    })}
                    type="number"
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {cardErrors.closing_day && (
                    <p className="text-red-600 text-sm mt-1">
                      {cardErrors.closing_day.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dia do Vencimento
                  </label>
                  <input
                    {...registerCard("due_day", {
                      required: "Dia do vencimento é obrigatório",
                      valueAsNumber: true,
                      min: { value: 1, message: "Dia deve ser entre 1 e 31" },
                      max: { value: 31, message: "Dia deve ser entre 1 e 31" },
                    })}
                    type="number"
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {cardErrors.due_day && (
                    <p className="text-red-600 text-sm mt-1">
                      {cardErrors.due_day.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : editingCard ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Compra */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Nova Compra no Cartão
            </h2>

            <form onSubmit={handleTransactionSubmit(onTransactionSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cartão
                </label>
                <select
                  {...registerTransaction("credit_card_id", {
                    required: "Cartão é obrigatório",
                  })}
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o cartão</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                {transactionErrors.credit_card_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {transactionErrors.credit_card_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  {...registerTransaction("amount", {
                    required: "Valor é obrigatório",
                    valueAsNumber: true,
                    min: { value: 0.01, message: "Valor deve ser maior que zero" },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {transactionErrors.amount && (
                  <p className="text-red-600 text-sm mt-1">
                    {transactionErrors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  {...registerTransaction("description", {
                    required: "Descrição é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Compra no supermercado"
                />
                {transactionErrors.description && (
                  <p className="text-red-600 text-sm mt-1">
                    {transactionErrors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  {...registerTransaction("category_id", {
                    required: "Categoria é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {transactionErrors.category_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {transactionErrors.category_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    {...registerTransaction("date", { required: "Data é obrigatória" })}
                    type="date"
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {transactionErrors.date && (
                    <p className="text-red-600 text-sm mt-1">
                      {transactionErrors.date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parcelas
                  </label>
                  <input
                    {...registerTransaction("installments", {
                      required: "Número de parcelas é obrigatório",
                      valueAsNumber: true,
                      min: { value: 1, message: "Mínimo 1 parcela" },
                      max: { value: 24, message: "Máximo 24 parcelas" },
                    })}
                    type="number"
                    min="1"
                    max="24"
                    defaultValue={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {transactionErrors.installments && (
                    <p className="text-red-600 text-sm mt-1">
                      {transactionErrors.installments.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Criando..." : "Criar Compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Pagar Fatura do Cartão
            </h2>

            <form onSubmit={handlePaymentSubmit(onPaymentSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cartão
                </label>
                <select
                  {...registerPayment("credit_card_id", {
                    required: "Cartão é obrigatório",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o cartão</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} - {formatCurrency(card.current_balance)}
                    </option>
                  ))}
                </select>
                {paymentErrors.credit_card_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {paymentErrors.credit_card_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta para Débito
                </label>
                <select
                  {...registerPayment("account_id", {
                    required: "Conta é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a conta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
                {paymentErrors.account_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {paymentErrors.account_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Pagamento
                </label>
                <input
                  {...registerPayment("amount", {
                    required: "Valor é obrigatório",
                    valueAsNumber: true,
                    min: { value: 0.01, message: "Valor deve ser maior que zero" },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {paymentErrors.amount && (
                  <p className="text-red-600 text-sm mt-1">
                    {paymentErrors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Pagamento
                </label>
                <input
                  {...registerPayment("date", { required: "Data é obrigatória" })}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {paymentErrors.date && (
                  <p className="text-red-600 text-sm mt-1">
                    {paymentErrors.date.message}
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Processando..." : "Pagar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Transação */}
      {isEditTransactionModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Editar Transação
            </h2>

            <form onSubmit={handleEditTransactionSubmit(onEditTransactionSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  {...registerEditTransaction("amount", {
                    required: "Valor é obrigatório",
                    valueAsNumber: true,
                    min: { value: 0.01, message: "Valor deve ser maior que zero" },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {editTransactionErrors.amount && (
                  <p className="text-red-600 text-sm mt-1">
                    {editTransactionErrors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  {...registerEditTransaction("description", {
                    required: "Descrição é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Compra no supermercado"
                />
                {editTransactionErrors.description && (
                  <p className="text-red-600 text-sm mt-1">
                    {editTransactionErrors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  {...registerEditTransaction("category_id", {
                    required: "Categoria é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {editTransactionErrors.category_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {editTransactionErrors.category_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    {...registerEditTransaction("date", { required: "Data é obrigatória" })}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {editTransactionErrors.date && (
                    <p className="text-red-600 text-sm mt-1">
                      {editTransactionErrors.date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parcelas
                  </label>
                  <input
                    {...registerEditTransaction("installments", {
                      required: "Número de parcelas é obrigatório",
                      valueAsNumber: true,
                      min: { value: 1, message: "Mínimo 1 parcela" },
                      max: { value: 24, message: "Máximo 24 parcelas" },
                    })}
                    type="number"
                    min="1"
                    max="24"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {editTransactionErrors.installments && (
                    <p className="text-red-600 text-sm mt-1">
                      {editTransactionErrors.installments.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTransactionModalOpen(false);
                    setEditingTransaction(null);
                    resetEditTransaction();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Atualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adiantar Parcela */}
      {isAdvanceModalOpen && advancingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Adiantar Parcela
            </h2>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 truncate">
                  {advancingTransaction.description}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <span className="font-medium">Parcela Atual:</span>
                    <p>{advancingTransaction.current_installment} de {advancingTransaction.installments}</p>
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span>
                    <p>{formatCurrency(advancingTransaction.amount)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Atenção</span>
                </div>
                <p className="text-yellow-800 text-sm">
                  Isso criará a próxima parcela ({advancingTransaction.current_installment + 1} de {advancingTransaction.installments}) 
                  e adicionará o valor à fatura do cartão.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsAdvanceModalOpen(false);
                    setAdvancingTransaction(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={processAdvanceInstallment}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Processando..." : "Adiantar Parcela"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}