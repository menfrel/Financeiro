import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  Target,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, startOfMonth, endOfMonth, isWithinInterval, parse, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Budget {
  id: string;
  amount: number;
  description?: string;
  period: "monthly";
  start_date: string;
  end_date: string;
  created_at: string;
  category: {
    id: string;
    name: string;
    color: string;
    type: "income" | "expense";
  } | null;
}

interface BudgetForm {
  category_id: string;
  amount: number;
  description?: string;
  start_date: string;
  end_date: string;
  payment_method: "account" | "credit_card";
  credit_card_id?: string;
}

interface BudgetWithSpent extends Budget {
  spent: number;
  percentage: number;
  status: "safe" | "warning" | "danger";
  payment_method?: "account" | "credit_card";
  credit_card_id?: string;
}

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Estados para o modal de pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedBudgetForPayment, setSelectedBudgetForPayment] = useState<BudgetWithSpent | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BudgetForm>();

  const watchPaymentMethod = watch("payment_method");
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Calcular o período do mês selecionado
      const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      // Load budgets - garantir isolamento por usuário
      const { data: budgetsData, error: budgetsError } = await supabase
        .from("budgets")
        .select(`
          *,
          categories (id, name, color, type)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (budgetsError) {
        console.error("Error loading budgets:", budgetsError);
        setBudgets([]);
        setLoading(false);
        return;
      }

      // Load expense categories - garantir isolamento por usuário
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .order("name", { ascending: true });

      if (categoriesError) {
        console.error("Error loading categories:", categoriesError);
        setCategories([]);
      }

      // Load accounts - necessário para criar lançamentos
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (accountsError) {
        console.error("Error loading accounts:", accountsError);
        setAccounts([]);
      }

      // Load credit cards
      const { data: creditCardsData, error: creditCardsError } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (creditCardsError) {
        console.error("Error loading credit cards:", creditCardsError);
        setCreditCards([]);
      }

      setCategories(categoriesData || []);
      setAccounts(accountsData || []);
      setCreditCards(creditCardsData || []);

      // Calculate spent amounts for each budget
      if (budgetsData && budgetsData.length > 0) {
        // Filtrar orçamentos que se sobrepõem ao mês selecionado
        const filteredBudgets = budgetsData.filter(budget => {
          const budgetStart = new Date(budget.start_date);
          const budgetEnd = new Date(budget.end_date);
          const monthStart = startOfMonth(selectedMonth);
          const monthEnd = endOfMonth(selectedMonth);
          
          // Verificar se o orçamento se sobrepõe ao mês selecionado
          return budgetStart <= monthEnd && budgetEnd >= monthStart;
        });

        const budgetsWithSpent = await Promise.all(
          filteredBudgets.map(async (budget) => {
            let spent = 0;

            if (budget.payment_method === "credit_card" && budget.credit_card_id) {
              // Buscar gastos no cartão de crédito
              const { data: creditCardTransactions, error: creditCardError } = await supabase
                .from("credit_card_transactions")
                .select("amount")
                .eq("user_id", user.id)
                .eq("credit_card_id", budget.credit_card_id)
                .gte("date", budget.start_date)
                .lte("date", budget.end_date);

              if (creditCardError) {
                console.error("Error loading credit card transactions for budget:", creditCardError);
              } else {
                spent = creditCardTransactions?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
              }
            } else {
              // Buscar gastos nas contas (comportamento original)
              const { data: transactions, error: transactionsError } = await supabase
                .from("transactions")
                .select("amount")
                .eq("user_id", user.id)
                .eq("category_id", budget.category_id)
                .eq("type", "expense")
                .gte("date", budget.start_date)
                .lte("date", budget.end_date);

              if (transactionsError) {
                console.error("Error loading transactions for budget:", transactionsError);
              } else {
                spent = transactions?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
              }
            }

            const budgetAmount = parseFloat(budget.amount) || 0;
            const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

            let status: "safe" | "warning" | "danger" = "safe";
            if (percentage >= 100) status = "danger";
            else if (percentage >= 80) status = "warning";

            return {
              ...budget,
              amount: budgetAmount,
              category: budget.categories, // Corrigir o mapeamento da categoria
              payment_method: budget.payment_method || "account",
              credit_card_id: budget.credit_card_id,
              spent,
              percentage,
              status,
            };
          }),
        );

        setBudgets(budgetsWithSpent);
      } else {
        setBudgets([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (budget: BudgetWithSpent) => {
    if (budget.payment_method === "credit_card" && (!creditCards || creditCards.length === 0)) {
      alert("Você precisa ter pelo menos um cartão de crédito cadastrado para criar o lançamento.");
      return;
    }
    
    if (budget.payment_method === "account" && (!accounts || accounts.length === 0)) {
      alert("Você precisa ter pelo menos uma conta cadastrada para criar o lançamento.");
      return;
    }

    const amount = budget.amount - budget.spent; // Valor restante do orçamento

    if (amount <= 0) {
      alert("Este orçamento já foi totalmente pago ou não há valor restante.");
      return;
    }

    // Abrir modal de confirmação com valor editável
    setSelectedBudgetForPayment(budget);
    setPaymentAmount(amount);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBudgetForPayment) {
      return;
    }

    if (paymentAmount <= 0) {
      alert("O valor do pagamento deve ser maior que zero.");
      return;
    }

    setPaymentSubmitting(true);

    try {
      if (selectedBudgetForPayment.payment_method === "credit_card" && selectedBudgetForPayment.credit_card_id) {
        // Criar lançamento no cartão de crédito
        const { error: creditCardError } = await supabase
          .from("credit_card_transactions")
          .insert({
            user_id: user!.id,
            credit_card_id: selectedBudgetForPayment.credit_card_id,
            amount: paymentAmount,
            description: `Pagamento - ${selectedBudgetForPayment.category?.name}${selectedBudgetForPayment.description ? ` - ${selectedBudgetForPayment.description}` : ''}`,
            date: format(new Date(), "yyyy-MM-dd"),
            installments: 1,
            current_installment: 1,
          });

        if (creditCardError) {
          console.error("Error creating credit card transaction:", creditCardError);
          alert("Erro ao criar lançamento no cartão. Tente novamente.");
          return;
        }

        // Atualizar saldo do cartão
        const creditCard = creditCards.find(c => c.id === selectedBudgetForPayment.credit_card_id);
        if (creditCard) {
          const { error: updateCardError } = await supabase
            .from("credit_cards")
            .update({
              current_balance: creditCard.current_balance + paymentAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", selectedBudgetForPayment.credit_card_id);

          if (updateCardError) {
            console.error("Error updating credit card balance:", updateCardError);
          }
        }
      } else {
        // Criar lançamento na conta (comportamento original)
        const account = accounts[0]; // Usar a primeira conta disponível

        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: user!.id,
            account_id: account.id,
            category_id: selectedBudgetForPayment.category?.id,
            amount: paymentAmount,
            type: "expense",
            description: `Pagamento - ${selectedBudgetForPayment.category?.name}${selectedBudgetForPayment.description ? ` - ${selectedBudgetForPayment.description}` : ''}`,
            date: format(new Date(), "yyyy-MM-dd"),
            is_recurring: false,
          });

        if (transactionError) {
          console.error("Error creating transaction:", transactionError);
          alert("Erro ao criar lançamento. Tente novamente.");
          return;
        }
      }

      alert(`Pagamento de ${formatCurrency(paymentAmount)} registrado com sucesso!`);
      setIsPaymentModalOpen(false);
      setSelectedBudgetForPayment(null);
      setPaymentAmount(0);
      await loadData(); // Recarregar dados para atualizar o gasto
    } catch (error) {
      console.error("Error marking budget as paid:", error);
      alert("Erro ao registrar pagamento. Tente novamente.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const onSubmit = async (data: BudgetForm) => {
    try {
      setSubmitting(true);

      const budgetData = {
        user_id: user!.id,
        category_id: data.category_id,
        amount: data.amount,
        description: data.description || null,
        period: "monthly" as const,
        start_date: data.start_date,
        end_date: data.end_date,
        payment_method: data.payment_method,
        credit_card_id: data.payment_method === "credit_card" ? data.credit_card_id : null,
      };

      if (editingBudget) {
        const { error } = await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", editingBudget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("budgets").insert(budgetData);

        if (error) throw error;
      }

      await loadData();
      setIsModalOpen(false);
      setEditingBudget(null);
      reset();
    } catch (error) {
      console.error("Error saving budget:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setValue("category_id", budget.category?.id || "");
    setValue("amount", budget.amount);
    setValue("description", budget.description || "");
    setValue("start_date", budget.start_date);
    setValue("end_date", budget.end_date);
    setValue("payment_method", budget.payment_method || "account");
    setValue("credit_card_id", budget.credit_card_id || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (budgetId: string) => {
    if (!confirm("Deseja realmente excluir este orçamento?")) return;

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  };

  const openModal = () => {
    setEditingBudget(null);
    reset();
    const startDate = startOfMonth(selectedMonth);
    const endDate = endOfMonth(selectedMonth);
    setValue("start_date", format(startDate, "yyyy-MM-dd"));
    setValue("end_date", format(endDate, "yyyy-MM-dd"));
    setValue("payment_method", "account");
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number | null | undefined) => {
    // Garantir que o valor seja um número válido
    const numericValue = typeof value === "number" && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "danger":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe":
        return CheckCircle;
      case "warning":
        return AlertTriangle;
      case "danger":
        return AlertTriangle;
      default:
        return Target;
    }
  };

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
      {/* Navegação por Mês */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
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
            {budgets.length} orçamento(s) no mês
          </p>
        </div>

        <button
          onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600 mt-2">
            Defina e acompanhe seus limites de gastos para {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* Cards de Resumo dos Orçamentos */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Previsão Total do Mês
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(budgets.reduce((sum, budget) => sum + budget.amount, 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {budgets.length} orçamento(s) ativo(s)
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Gasto
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(budgets.reduce((sum, budget) => sum + budget.spent, 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Gastos realizados
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Saldo Restante
                </p>
                <p className={`text-2xl font-bold ${
                  budgets.reduce((sum, budget) => sum + (budget.amount - budget.spent), 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {formatCurrency(budgets.reduce((sum, budget) => sum + (budget.amount - budget.spent), 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {budgets.reduce((sum, budget) => sum + (budget.amount - budget.spent), 0) >= 0
                    ? "Dentro do orçamento"
                    : "Acima do orçamento"
                  }
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                budgets.reduce((sum, budget) => sum + (budget.amount - budget.spent), 0) >= 0
                  ? "bg-green-100"
                  : "bg-red-100"
              }`}>
                <TrendingUp className={`w-6 h-6 ${
                  budgets.reduce((sum, budget) => sum + (budget.amount - budget.spent), 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum orçamento encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            Crie um orçamento para {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })} para controlar seus gastos
          </p>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Criar Orçamento para {format(selectedMonth, 'MMM yyyy', { locale: ptBR })}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const StatusIcon = getStatusIcon(budget.status);
            return (
              <div
                key={budget.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: budget.category?.color || "#6B7280",
                      }}
                  <div className="flex items-center space-x-2 mb-2">
                    {selectedBudgetForPayment.payment_method === "credit_card" ? (
                      <>
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-600 font-medium">Pagamento no Cartão de Crédito</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Pagamento em Conta</span>
                      </>
                    )}
                  </div>
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {budget.category?.name || "Categoria não encontrada"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {format(parse(budget.start_date, "yyyy-MM-dd", new Date()), "dd/MM", { locale: ptBR })} - {format(parse(budget.end_date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {budget.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {budget.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {budget.payment_method === "credit_card" ? (
                          <>
                            <CreditCard className="w-3 h-3 text-purple-600" />
                            <span className="text-xs text-purple-600">Cartão de Crédito</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">Conta Bancária</span>
                          </>
                        )}
                      </div>
                      {budget.category?.type && (
                        <p className="text-xs text-gray-500 capitalize">
                          {budget.category.type === "income"
                            ? "Receita"
                            : "Despesa"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budget.status)}`}
                    >
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {budget.percentage.toFixed(0)}%
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Gasto</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(budget.spent)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          budget.status === "danger"
                            ? "bg-red-500"
                            : budget.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(budget.percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Orçamento</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(budget.amount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Restante</span>
                    <span
                      className={`font-semibold ${
                        budget.amount - budget.spent >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(budget.amount - budget.spent)}
                    </span>
                  </div>

                  {/* Botão Marcar como Pago */}
                  {budget.amount - budget.spent > 0 && (
                    <button
                      onClick={() => handleMarkAsPaid(budget)}
                      className={`w-auto px-3 py-1.5 text-white rounded-lg text-xs transition-colors flex items-center space-x-1 ${
                        budget.payment_method === "credit_card" 
                          ? "bg-purple-600 hover:bg-purple-700" 
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {budget.payment_method === "credit_card" ? (
                        <>
                          <CreditCard className="w-3 h-3" />
                          <span>Pagar no Cartão</span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3" />
                          <span>Pagar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingBudget ? "Editar Orçamento" : "Novo Orçamento"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  {...register("category_id", {
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
                {errors.category_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Orçamento
                </label>
                <input
                  {...register("amount", {
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
                {errors.amount && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pagamento
                </label>
                <select
                  {...register("payment_method", {
                    required: "Método de pagamento é obrigatório",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="account">Conta Bancária</option>
                  <option value="credit_card">Cartão de Crédito</option>
                </select>
                {errors.payment_method && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.payment_method.message}
                  </p>
                )}
              </div>

              {watchPaymentMethod === "credit_card" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cartão de Crédito
                  </label>
                  <select
                    {...register("credit_card_id", {
                      required: watchPaymentMethod === "credit_card" ? "Cartão é obrigatório" : false,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o cartão</option>
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} - Limite: {formatCurrency(card.limit_amount)}
                      </option>
                    ))}
                  </select>
                  {errors.credit_card_id && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.credit_card_id.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  {...register("description")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Orçamento para tratamento dentário"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inicial
                  </label>
                  <input
                    {...register("start_date", {
                      required: "Data inicial é obrigatória",
                    })}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.start_date && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.start_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Final
                  </label>
                  <input
                    {...register("end_date", {
                      required: "Data final é obrigatória",
                    })}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.end_date && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.end_date.message}
                    </p>
                  )}
                </div>
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
                    : editingBudget
                      ? "Atualizar"
                      : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {isPaymentModalOpen && selectedBudgetForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Confirmar Pagamento
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  {selectedBudgetForPayment.category?.name || "Categoria não encontrada"}
                </h3>
                {selectedBudgetForPayment.description && (
                  <p className="text-sm text-gray-600 mb-2 truncate">
                    {selectedBudgetForPayment.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Orçamento:</span>
                    <p className="font-medium">{formatCurrency(selectedBudgetForPayment.amount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Já gasto:</span>
                    <p className="font-medium">{formatCurrency(selectedBudgetForPayment.spent)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Pagamento
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor restante disponível: {formatCurrency(selectedBudgetForPayment.amount - selectedBudgetForPayment.spent)}
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedBudgetForPayment(null);
                    setPaymentAmount(0);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={paymentSubmitting || paymentAmount <= 0}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                    selectedBudgetForPayment?.payment_method === "credit_card"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {paymentSubmitting ? "Confirmando..." : "Confirmar Pagamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}