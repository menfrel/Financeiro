import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Filter,
  Calendar,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, parse } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  is_recurring: boolean;
  recurring_frequency?: "weekly" | "monthly" | null;
  recurring_until?: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
}

interface TransactionForm {
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  account_id: string;
  category_id: string;
  is_recurring: boolean;
  recurring_frequency?: "weekly" | "monthly";
  recurring_until?: string;
}

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({
    type: "",
    account: "",
    category: "",
    startDate: "",
    endDate: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionForm>();
  const watchType = watch("type");
  const watchIsRecurring = watch("is_recurring");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const recalculateAccountBalances = async (accountIds: string[]) => {
    try {
      for (const accountId of accountIds) {
        // Buscar a conta
        const { data: account } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (!account) continue;

        // Buscar todas as transações da conta
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("account_id", accountId);

        const initialBalance = parseFloat(account.initial_balance) || 0;
        const transactionBalance = (transactions || []).reduce(
          (sum, transaction) => {
            const amount = parseFloat(transaction.amount) || 0;
            return sum + (transaction.type === "income" ? amount : -amount);
          },
          0,
        );

        const calculatedBalance = initialBalance + transactionBalance;

        // Atualizar o saldo atual
        await supabase
          .from("accounts")
          .update({
            current_balance: calculatedBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);
      }
    } catch (error) {
      console.error("Error recalculating account balances:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Load transactions - garantir isolamento por usuário
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select(
          `
          *,
          accounts!inner (id, name),
          categories!inner (id, name, color)
        `,
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      // Load accounts - garantir isolamento por usuário
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      // Load categories - garantir isolamento por usuário
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      // Validar dados das transações
      const validatedTransactions = (transactionsData || []).map(
        (transaction) => ({
          ...transaction,
          amount: parseFloat(transaction.amount) || 0,
        }),
      );

      // Validar dados das contas
      const validatedAccounts = (accountsData || []).map((account) => ({
        ...account,
        initial_balance: parseFloat(account.initial_balance) || 0,
        current_balance: parseFloat(account.current_balance) || parseFloat(account.initial_balance) || 0,
      }));

      setTransactions(validatedTransactions);
      setAccounts(validatedAccounts);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TransactionForm) => {
    try {
      setSubmitting(true);

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      const transactionData = {
        user_id: user.id,
        amount: data.amount,
        type: data.type,
        description: data.description,
        date: data.date,
        account_id: data.account_id,
        category_id: data.category_id,
        is_recurring: data.is_recurring,
        recurring_frequency: data.is_recurring
          ? data.recurring_frequency
          : null,
        recurring_until: data.is_recurring ? data.recurring_until : null,
      };

      if (editingTransaction) {
        // Garantir que só pode editar transações do próprio usuário
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert(transactionData);

        if (error) throw error;
      }

      // Recalcular saldos das contas afetadas
      await recalculateAccountBalances(
        [data.account_id, editingTransaction?.account?.id].filter(Boolean),
      );

      await loadData();
      setIsModalOpen(false);
      setEditingTransaction(null);
      reset();
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setValue("amount", transaction.amount);
    setValue("type", transaction.type);
    setValue("description", transaction.description);
    setValue("date", transaction.date);
    setValue("account_id", transaction.account?.id || "");
    setValue("category_id", transaction.category?.id || "");
    setValue("is_recurring", transaction.is_recurring);
    if (transaction.recurring_frequency) {
      setValue("recurring_frequency", transaction.recurring_frequency);
    }
    if (transaction.recurring_until) {
      setValue("recurring_until", transaction.recurring_until);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Deseja realmente excluir esta transação?")) return;

    try {
      // Encontrar a transação para saber qual conta recalcular
      const transaction = transactions.find((t) => t.id === transactionId);
      const accountId = transaction?.account?.id;

      // Garantir que só pode deletar transações do próprio usuário
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user!.id);

      if (error) throw error;

      // Recalcular saldo da conta afetada
      if (accountId) {
        await recalculateAccountBalances([accountId]);
      }

      await loadData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const openModal = () => {
    setEditingTransaction(null);
    reset();
    setValue("date", format(new Date(), "yyyy-MM-dd"));
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

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter.type && transaction.type !== filter.type) return false;
    if (filter.account && transaction.account?.id !== filter.account)
      return false;
    if (filter.category && transaction.category?.id !== filter.category)
      return false;
    if (filter.startDate && transaction.date < filter.startDate) return false;
    if (filter.endDate && transaction.date > filter.endDate) return false;
    return true;
  });

  const availableCategories = categories.filter(
    (cat) => !watchType || cat.type === watchType,
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-600 mt-2">
            Registre suas receitas e despesas
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={filter.type}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, type: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>

          <select
            value={filter.account}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, account: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as contas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <select
            value={filter.category}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, category: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filter.startDate}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, startDate: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Data inicial"
          />

          <input
            type="date"
            value={filter.endDate}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Data final"
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <ArrowUpRight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum lançamento encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Registre seu primeiro lançamento para começar
            </p>
            <button
              onClick={openModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Novo Lançamento
            </button>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      transaction.type === "income"
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-6 h-6 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">
                        {transaction.description}
                      </h3>
                      {transaction.is_recurring && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Recorrente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>
                        {transaction.category?.name || "Sem categoria"}
                      </span>
                      <span>•</span>
                      <span>{transaction.account?.name || "Sem conta"}</span>
                      <span>•</span>
                      <span>
                        {format(parse(transaction.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  {...register("type", { required: "Tipo é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
                {errors.type && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
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
                  Descrição
                </label>
                <input
                  {...register("description", {
                    required: "Descrição é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Salário, Aluguel, etc."
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  {...register("date", { required: "Data é obrigatória" })}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.date && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta
                </label>
                <select
                  {...register("account_id", {
                    required: "Conta é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a conta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.account_id.message}
                  </p>
                )}
              </div>

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
                  {availableCategories.map((category) => (
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

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    {...register("is_recurring")}
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Lançamento recorrente
                  </span>
                </label>

                {watchIsRecurring && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequência
                      </label>
                      <select
                        {...register("recurring_frequency")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Até
                      </label>
                      <input
                        {...register("recurring_until")}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
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
                    : editingTransaction
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