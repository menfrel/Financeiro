import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Plus, ArrowUpRight, Filter, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { format, parse } from "date-fns";
import { TransactionCard } from "./TransactionCard";
import { LayoutToggle } from "./LayoutToggle";

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
  payment_method: "account" | "credit_card";
  credit_card_id?: string;
  is_recurring: boolean;
  recurring_frequency?: "weekly" | "monthly";
  recurring_until?: string;
}

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDetailed, setIsDetailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
  const watchPaymentMethod = watch("payment_method");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const recalculateAccountBalances = async (accountIds: string[]) => {
    try {
      for (const accountId of accountIds) {
        const { data: account } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (!account) continue;

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

      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

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

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      // Load credit cards
      const { data: creditCardsData } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      const validatedTransactions = (transactionsData || []).map(
        (transaction) => ({
          ...transaction,
          amount: parseFloat(String(transaction.amount)) || 0,
        }),
      );

      const validatedAccounts = (accountsData || []).map((account) => ({
        ...account,
        initial_balance: parseFloat(account.initial_balance) || 0,
        current_balance:
          parseFloat(account.current_balance) ||
          parseFloat(account.initial_balance) ||
          0,
      }));

      setTransactions(validatedTransactions);
      setAccounts(validatedAccounts);
      setCategories(categoriesData || []);
      setCreditCards(creditCardsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TransactionForm) => {
    try {
      setSubmitting(true);

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
        account_id: data.payment_method === "account" ? data.account_id : null,
        category_id: data.category_id,
        is_recurring: data.is_recurring,
        recurring_frequency: data.is_recurring
          ? data.recurring_frequency
          : null,
        recurring_until: data.is_recurring ? data.recurring_until : null,
      };

      if (data.payment_method === "credit_card" && data.credit_card_id) {
        // Create credit card transaction
        const { error } = await supabase
          .from("credit_card_transactions")
          .insert({
            user_id: user.id,
            credit_card_id: data.credit_card_id,
            amount: data.amount,
            description: data.description,
            date: data.date,
            installments: 1,
            current_installment: 1,
          });

        if (error) throw error;

        // Update credit card balance
        const card = creditCards.find(c => c.id === data.credit_card_id);
        if (card) {
          await supabase
            .from("credit_cards")
            .update({
              current_balance: card.current_balance + data.amount,
            })
            .eq("id", data.credit_card_id);
        }
      } else {
        // Regular account transaction
        if (editingTransaction) {
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

        if (data.account_id) {
          await recalculateAccountBalances(
            [data.account_id, editingTransaction?.account?.id].filter(Boolean),
          );
        }
      }

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
    setValue("payment_method", "account");
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
      const transaction = transactions.find((t) => t.id === transactionId);
      const accountId = transaction?.account?.id;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user!.id);

      if (error) throw error;

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
    setValue("payment_method", "account");
    setIsModalOpen(true);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    // Search filter
    if (
      searchTerm &&
      !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Other filters
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
    (cat) => {
      // For credit card transactions, only show expense categories
      if (watchPaymentMethod === "credit_card") {
        return cat.type === "expense";
      }
      return !watchType || cat.type === watchType;
    },
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-600 mt-2">
            Registre suas receitas e despesas
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <LayoutToggle isDetailed={isDetailed} onToggle={setIsDetailed} />
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filtros e Busca</span>
        </div>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Controls */}
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
      </div>

      {/* Transactions List */}
      <div
        className={`${isDetailed ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"}`}
      >
        {filteredTransactions.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ArrowUpRight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum lançamento encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || Object.values(filter).some((v) => v)
                ? "Tente ajustar os filtros de busca"
                : "Registre seu primeiro lançamento para começar"}
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
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              isDetailed={isDetailed}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
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
                  Forma de Pagamento
                </label>
                <select
                  {...register("payment_method", {
                    required: "Forma de pagamento é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a forma de pagamento</option>
                  <option value="account">Conta Bancária</option>
                  <option value="credit_card">Cartão de Crédito</option>
                </select>
                {errors.payment_method && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.payment_method.message}
                  </p>
                )}
              </div>

              {watchPaymentMethod === "account" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta
                  </label>
                  <select
                    {...register("account_id", {
                      required: watchPaymentMethod === "account" ? "Conta é obrigatória" : false,
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
              )}

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
                        {card.name} - Disponível: {formatCurrency(card.limit_amount - card.current_balance)}
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
