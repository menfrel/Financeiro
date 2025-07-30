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
}

interface BudgetWithSpent extends Budget {
  spent: number;
  percentage: number;
  status: "safe" | "warning" | "danger";
}

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BudgetForm>();

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

      // Load budgets - garantir isolamento por usuário
      const { data: budgetsData, error: budgetsError } = await supabase
        .from("budgets")
        .select(`
          *,
          categories (id, name, color, type)
        `)
        .eq("user_id", user.id)
        .gte("start_date", format(startOfMonth(selectedMonth), "yyyy-MM-dd"))
        .lte("end_date", format(endOfMonth(selectedMonth), "yyyy-MM-dd"))
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

      setCategories(categoriesData || []);

      // Calculate spent amounts for each budget
      if (!budgetsData || budgetsData.length === 0) {
        setBudgets([]);
        setLoading(false);
        return;
      }

      const budgetsWithSpent = await Promise.all(
        budgetsData.map(async (budget) => {
          // Verificar se a categoria existe
          if (!budget.categories) {
            console.warn(`Budget ${budget.id} has no category`);
            return {
              ...budget,
              amount: parseFloat(budget.amount) || 0,
              spent: 0,
              percentage: 0,
              status: 'safe' as const,
              category: null
            };
          }

          const { data: transactions, error: transactionsError } =
            await supabase
              .from("transactions")
              .select("amount")
              .eq("user_id", user.id)
              .eq("category_id", budget.category_id)
              .eq("type", "expense")
              .gte("date", budget.start_date)
              .lte("date", budget.end_date);

          if (transactionsError) {
            console.error(
              "Error loading transactions for budget:",
              transactionsError,
            );
          }

          const spent =
            transactions?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
          const budgetAmount = parseFloat(budget.amount) || 0;
          const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

          let status: "safe" | "warning" | "danger" = "safe";
          if (percentage >= 100) status = "danger";
          else if (percentage >= 80) status = "warning";

          return {
            ...budget,
            amount: budgetAmount,
            category: budget.categories,
            spent,
            percentage,
            status,
          };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
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
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {budget.category?.name || "Categoria não encontrada"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {format(parse(budget.start_date, "yyyy-MM-dd", new Date()), "dd/MM", { locale: ptBR })} - {format(parse(budget.end_date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {budget.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {budget.description}
                        </p>
                      )}
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
    </div>
  );
}