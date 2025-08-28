import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  CreditCard,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  current_balance: number;
  closing_day: number;
  due_day: number;
  created_at: string;
  updated_at: string;
}

interface CreditCardTransaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  installments: number;
  current_installment: number;
  created_at: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
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
  category_id?: string;
}

interface BillingCycle {
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  isCurrentCycle: boolean;
}

export function CreditCards() {
  const { user } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("cards");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreditCardForm>();

  const {
    register: registerTransaction,
    handleSubmit: handleTransactionSubmit,
    reset: resetTransaction,
    formState: { errors: transactionErrors },
  } = useForm<TransactionForm>();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCard) {
      loadTransactions();
    }
  }, [selectedCard, selectedMonth]);

  // Função para calcular o ciclo de faturamento baseado no dia de fechamento
  const calculateBillingCycle = (closingDay: number, referenceDate: Date): BillingCycle => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    // Data de fechamento do mês atual
    let currentClosingDate = new Date(year, month, closingDay);
    
    // Se o dia de fechamento já passou no mês atual, usar o próximo mês
    if (referenceDate > currentClosingDate) {
      currentClosingDate = new Date(year, month + 1, closingDay);
    }
    
    // Data de fechamento anterior (início do ciclo atual)
    const previousClosingDate = new Date(currentClosingDate);
    previousClosingDate.setMonth(previousClosingDate.getMonth() - 1);
    
    // Período do ciclo: do dia seguinte ao fechamento anterior até o fechamento atual
    const startDate = addDays(previousClosingDate, 1);
    const endDate = currentClosingDate;
    
    // Data de vencimento (normalmente alguns dias após o fechamento)
    const dueDate = addDays(currentClosingDate, 10); // Assumindo 10 dias após fechamento
    
    // Verificar se é o ciclo atual
    const today = new Date();
    const isCurrentCycle = today >= startDate && today <= endDate;
    
    return {
      startDate,
      endDate,
      dueDate,
      isCurrentCycle
    };
  };

  // Função para obter o ciclo de faturamento para um mês específico
  const getBillingCycleForMonth = (closingDay: number, targetMonth: Date): BillingCycle => {
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    
    // Data de fechamento do mês selecionado
    const closingDate = new Date(year, month, closingDay);
    
    // Data de fechamento anterior
    const previousClosingDate = new Date(closingDate);
    previousClosingDate.setMonth(previousClosingDate.getMonth() - 1);
    
    // Período do ciclo
    const startDate = addDays(previousClosingDate, 1);
    const endDate = closingDate;
    const dueDate = addDays(closingDate, 10);
    
    const today = new Date();
    const isCurrentCycle = today >= startDate && today <= endDate;
    
    return {
      startDate,
      endDate,
      dueDate,
      isCurrentCycle
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Load credit cards
      const { data: cardsData, error: cardsError } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cardsError) {
        console.error("Error loading credit cards:", cardsError);
        setCreditCards([]);
      } else {
        const validatedCards = (cardsData || []).map((card) => ({
          ...card,
          limit_amount: parseFloat(card.limit_amount) || 0,
          current_balance: parseFloat(card.current_balance) || 0,
        }));
        setCreditCards(validatedCards);
        
        // Selecionar o primeiro cartão se não houver nenhum selecionado
        if (validatedCards.length > 0 && !selectedCard) {
          setSelectedCard(validatedCards[0].id);
        }
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .order("name", { ascending: true });

      if (categoriesError) {
        console.error("Error loading categories:", categoriesError);
        setCategories([]);
      } else {
        setCategories(categoriesData || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      if (!selectedCard || !user?.id) return;

      const card = creditCards.find(c => c.id === selectedCard);
      if (!card) return;

      // Calcular o ciclo de faturamento para o mês selecionado
      const billingCycle = getBillingCycleForMonth(card.closing_day, selectedMonth);
      
      console.log("Billing cycle:", {
        startDate: format(billingCycle.startDate, "dd/MM/yyyy"),
        endDate: format(billingCycle.endDate, "dd/MM/yyyy"),
        dueDate: format(billingCycle.dueDate, "dd/MM/yyyy"),
        isCurrentCycle: billingCycle.isCurrentCycle
      });

      // Buscar transações do período do ciclo de faturamento
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("credit_card_transactions")
        .select(`
          *,
          categories (id, name, color)
        `)
        .eq("user_id", user.id)
        .eq("credit_card_id", selectedCard)
        .gte("date", format(billingCycle.startDate, "yyyy-MM-dd"))
        .lte("date", format(billingCycle.endDate, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (transactionsError) {
        console.error("Error loading transactions:", transactionsError);
        setTransactions([]);
      } else {
        const validatedTransactions = (transactionsData || []).map((transaction) => ({
          ...transaction,
          amount: parseFloat(transaction.amount) || 0,
          category: transaction.categories || undefined,
        }));
        setTransactions(validatedTransactions);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
    }
  };

  const recalculateCreditCardBalance = async (cardId: string) => {
    try {
      const card = creditCards.find(c => c.id === cardId);
      if (!card) return;

      // Buscar todas as transações do cartão
      const { data: allTransactions } = await supabase
        .from("credit_card_transactions")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("credit_card_id", cardId);

      const totalBalance = (allTransactions || []).reduce(
        (sum, transaction) => sum + (parseFloat(transaction.amount) || 0),
        0
      );

      // Atualizar o saldo atual do cartão
      await supabase
        .from("credit_cards")
        .update({
          current_balance: totalBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId);

      // Recarregar dados
      await loadData();
    } catch (error) {
      console.error("Error recalculating credit card balance:", error);
    }
  };

  const onSubmit = async (data: CreditCardForm) => {
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
        closing_day: data.closing_day,
        due_day: data.due_day,
        current_balance: 0,
      };

      if (editingCard) {
        const { error } = await supabase
          .from("credit_cards")
          .update(cardData)
          .eq("id", editingCard.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("credit_cards").insert(cardData);

        if (error) throw error;
      }

      await loadData();
      setIsModalOpen(false);
      setEditingCard(null);
      reset();
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
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);

        const { error } = await supabase
          .from("credit_card_transactions")
          .insert({
            user_id: user.id,
            credit_card_id: data.credit_card_id,
            amount: installmentAmount,
            description:
              data.installments > 1
                ? `${data.description} (${i + 1}/${data.installments})`
                : data.description,
            date: format(installmentDate, "yyyy-MM-dd"),
            installments: data.installments,
            current_installment: i + 1,
            category_id: data.category_id || null,
          });

        if (error) throw error;
      }

      // Recalcular saldo do cartão
      await recalculateCreditCardBalance(data.credit_card_id);

      setIsTransactionModalOpen(false);
      resetTransaction();
      await loadTransactions();
    } catch (error) {
      console.error("Error creating credit card transaction:", error);
      alert("Erro ao criar transação no cartão");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setValue("name", card.name);
    setValue("limit_amount", card.limit_amount);
    setValue("closing_day", card.closing_day);
    setValue("due_day", card.due_day);
    setIsModalOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm("Deseja realmente excluir este cartão?")) return;

    try {
      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", user!.id);

      if (error) throw error;
      
      // Se o cartão deletado era o selecionado, limpar seleção
      if (selectedCard === cardId) {
        setSelectedCard("");
        setTransactions([]);
      }
      
      await loadData();
    } catch (error) {
      console.error("Error deleting credit card:", error);
      alert("Erro ao excluir cartão");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Deseja realmente excluir esta transação?")) return;

    try {
      const { error } = await supabase
        .from("credit_card_transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user!.id);

      if (error) throw error;

      // Recalcular saldo do cartão
      if (selectedCard) {
        await recalculateCreditCardBalance(selectedCard);
      }
      
      await loadTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Erro ao excluir transação");
    }
  };

  const openModal = () => {
    setEditingCard(null);
    reset();
    setIsModalOpen(true);
  };

  const openTransactionModal = () => {
    resetTransaction();
    setValue("date", format(new Date(), "yyyy-MM-dd"));
    setValue("installments", 1);
    setValue("credit_card_id", selectedCard);
    setIsTransactionModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calcular estatísticas da fatura baseadas no ciclo de fechamento
  const calculateBillingStats = (card: CreditCard) => {
    const billingCycle = getBillingCycleForMonth(card.closing_day, selectedMonth);
    
    // Filtrar transações do ciclo atual
    const cycleTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= billingCycle.startDate && transactionDate <= billingCycle.endDate;
    });

    const totalAmount = cycleTransactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = cycleTransactions.length;
    const availableLimit = card.limit_amount - card.current_balance;
    const utilizationPercentage = card.limit_amount > 0 ? (card.current_balance / card.limit_amount) * 100 : 0;

    return {
      totalAmount,
      transactionCount,
      availableLimit,
      utilizationPercentage,
      billingCycle,
      cycleTransactions
    };
  };

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-gray-600 mt-2">Gerencie seus cartões e faturas</p>
        </div>

        <div className="flex space-x-3">
          {activeTab === "transactions" && selectedCard && (
            <button
              onClick={openTransactionModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              <span>Nova Compra</span>
            </button>
          )}
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cartão</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("cards")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "cards"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Cartões
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "transactions"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Transações
        </button>
      </div>

      {activeTab === "cards" ? (
        // Cards Tab
        <div>
          {creditCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum cartão encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Cadastre seu primeiro cartão de crédito
              </p>
              <button
                onClick={openModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Cadastrar Cartão
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creditCards.map((card) => {
                const utilizationPercentage = card.limit_amount > 0 ? (card.current_balance / card.limit_amount) * 100 : 0;
                const availableLimit = card.limit_amount - card.current_balance;

                return (
                  <div
                    key={card.id}
                    className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedCard(card.id);
                      setActiveTab("transactions");
                    }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{card.name}</h3>
                        <p className="text-purple-100 text-sm">
                          Fechamento: dia {card.closing_day} • Vencimento: dia {card.due_day}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(card);
                          }}
                          className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(card.id);
                          }}
                          className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-purple-100 text-sm mb-1">Saldo Atual</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(card.current_balance)}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-purple-100 text-sm">Limite Disponível</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(availableLimit)}
                          </span>
                        </div>
                        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              utilizationPercentage > 80
                                ? "bg-red-300"
                                : utilizationPercentage > 60
                                  ? "bg-yellow-300"
                                  : "bg-green-300"
                            }`}
                            style={{
                              width: `${Math.min(utilizationPercentage, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-purple-100 text-xs mt-1">
                          {utilizationPercentage.toFixed(1)}% utilizado
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-100">Limite Total</span>
                        <span className="text-white font-semibold">
                          {formatCurrency(card.limit_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Transactions Tab
        <div>
          {!selectedCard ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione um cartão
              </h3>
              <p className="text-gray-600 mb-6">
                Escolha um cartão para ver suas transações
              </p>
              <button
                onClick={() => setActiveTab("cards")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Ver Cartões
              </button>
            </div>
          ) : (
            <div>
              {/* Card Selector and Billing Info */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedCard}
                      onChange={(e) => setSelectedCard(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>

                    {/* Informações do Ciclo de Faturamento */}
                    {(() => {
                      const card = creditCards.find(c => c.id === selectedCard);
                      if (!card) return null;
                      
                      const billingCycle = getBillingCycleForMonth(card.closing_day, selectedMonth);
                      
                      return (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">
                            Ciclo: {format(billingCycle.startDate, "dd/MM")} - {format(billingCycle.endDate, "dd/MM/yyyy")}
                          </p>
                          <p>
                            Vencimento: {format(billingCycle.dueDate, "dd/MM/yyyy")}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Navegação por Mês */}
              <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <button
                  onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Fatura do período de fechamento
                  </p>
                </div>

                <button
                  onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Estatísticas da Fatura */}
              {(() => {
                const card = creditCards.find(c => c.id === selectedCard);
                if (!card) return null;
                
                const stats = calculateBillingStats(card);
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor da Fatura</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(stats.totalAmount)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Transações</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {stats.transactionCount}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Limite Disponível</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(stats.availableLimit)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Utilização</p>
                          <p className={`text-2xl font-bold ${
                            stats.utilizationPercentage > 80 ? "text-red-600" : 
                            stats.utilizationPercentage > 60 ? "text-yellow-600" : "text-green-600"
                          }`}>
                            {stats.utilizationPercentage.toFixed(1)}%
                          </p>
                        </div>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          stats.utilizationPercentage > 80 ? "bg-red-100" : 
                          stats.utilizationPercentage > 60 ? "bg-yellow-100" : "bg-green-100"
                        }`}>
                          <TrendingDown className={`w-6 h-6 ${
                            stats.utilizationPercentage > 80 ? "text-red-600" : 
                            stats.utilizationPercentage > 60 ? "text-yellow-600" : "text-green-600"
                          }`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Search Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar transações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "Nenhuma transação encontrada" : "Nenhuma transação no período"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm 
                      ? "Tente ajustar o termo de busca" 
                      : (() => {
                          const card = creditCards.find(c => c.id === selectedCard);
                          if (!card) return "Selecione um cartão válido";
                          
                          const billingCycle = getBillingCycleForMonth(card.closing_day, selectedMonth);
                          return `Nenhuma compra no período de ${format(billingCycle.startDate, "dd/MM")} a ${format(billingCycle.endDate, "dd/MM/yyyy")}`;
                        })()
                    }
                  </p>
                  <button
                    onClick={openTransactionModal}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Registrar Compra
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 truncate">
                              {transaction.description}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              {transaction.category && (
                                <>
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: transaction.category.color }}
                                  />
                                  <span>{transaction.category.name}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>
                                {format(new Date(transaction.date), "dd/MM/yyyy")}
                              </span>
                              {transaction.installments > 1 && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {transaction.current_installment}/{transaction.installments}x
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(transaction.amount)}
                          </p>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors mt-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Cartão */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingCard ? "Editar Cartão" : "Novo Cartão"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cartão
                </label>
                <input
                  {...register("name", { required: "Nome é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Nubank, Itaú, etc."
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite
                </label>
                <input
                  {...register("limit_amount", {
                    required: "Limite é obrigatório",
                    valueAsNumber: true,
                    min: {
                      value: 0.01,
                      message: "Limite deve ser maior que zero",
                    },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {errors.limit_amount && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.limit_amount.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dia de Fechamento
                  </label>
                  <input
                    {...register("closing_day", {
                      required: "Dia de fechamento é obrigatório",
                      valueAsNumber: true,
                      min: { value: 1, message: "Dia deve ser entre 1 e 31" },
                      max: { value: 31, message: "Dia deve ser entre 1 e 31" },
                    })}
                    type="number"
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 15"
                  />
                  {errors.closing_day && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.closing_day.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    {...register("due_day", {
                      required: "Dia de vencimento é obrigatório",
                      valueAsNumber: true,
                      min: { value: 1, message: "Dia deve ser entre 1 e 31" },
                      max: { value: 31, message: "Dia deve ser entre 1 e 31" },
                    })}
                    type="number"
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 25"
                  />
                  {errors.due_day && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.due_day.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Exemplo:</strong> Se o fechamento é dia 15 e vencimento dia 25, 
                  as compras de 16/07 a 15/08 aparecerão na fatura com vencimento em 25/08.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? "Salvando..."
                    : editingCard
                      ? "Atualizar"
                      : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transação */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Nova Compra no Cartão
            </h2>

            <form
              onSubmit={handleTransactionSubmit(onTransactionSubmit)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cartão
                </label>
                <select
                  {...registerTransaction("credit_card_id", {
                    required: "Cartão é obrigatório",
                  })}
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
                  Categoria (opcional)
                </label>
                <select
                  {...registerTransaction("category_id")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  {...registerTransaction("amount", {
                    required: "Valor é obrigatório",
                    valueAsNumber: true,
                    min: {
                      value: 0.01,
                      message: "Valor deve ser maior que zero",
                    },
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data da Compra
                  </label>
                  <input
                    {...registerTransaction("date", {
                      required: "Data é obrigatória",
                    })}
                    type="date"
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
                  {submitting ? "Criando..." : "Registrar Compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}