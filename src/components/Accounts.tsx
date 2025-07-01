import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  Wallet,
  CreditCard,
  PiggyBank,
  Smartphone,
  Edit2,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";

interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "investment" | "digital_wallet";
  initial_balance: number;
  current_balance: number;
  created_at: string;
}

interface AccountForm {
  name: string;
  type: "checking" | "savings" | "investment" | "digital_wallet";
  initial_balance: number;
}

const accountTypes = [
  { value: "checking", label: "Conta Corrente", icon: CreditCard },
  { value: "savings", label: "Poupança", icon: PiggyBank },
  { value: "investment", label: "Investimento", icon: Wallet },
  { value: "digital_wallet", label: "Carteira Digital", icon: Smartphone },
];

export function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AccountForm>();

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const recalculateAccountBalances = async () => {
    try {
      // Buscar todas as contas
      const { data: accounts } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user!.id);

      if (!accounts) return;

      // Para cada conta, calcular o saldo baseado nas transações
      for (const account of accounts) {
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user!.id)
          .eq("account_id", account.id);

        const initialBalance =
          typeof account.initial_balance === "number"
            ? account.initial_balance
            : 0;
        const transactionBalance = (transactions || []).reduce(
          (sum, transaction) => {
            const amount =
              typeof transaction.amount === "number" ? transaction.amount : 0;
            return sum + (transaction.type === "income" ? amount : -amount);
          },
          0,
        );

        const calculatedBalance = initialBalance + transactionBalance;

        // Atualizar apenas se o saldo calculado for diferente do atual
        if (
          Math.abs(calculatedBalance - (account.current_balance || 0)) > 0.01
        ) {
          await supabase
            .from("accounts")
            .update({
              current_balance: calculatedBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);
        }
      }
    } catch (error) {
      console.error("Error recalculating account balances:", error);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);

      // Primeiro, recalcular os saldos
      await recalculateAccountBalances();

      // Depois, carregar os dados atualizados
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Garantir que os valores numéricos sejam válidos
      const validatedAccounts = (data || []).map((account) => ({
        ...account,
        initial_balance:
          typeof account.initial_balance === "number"
            ? account.initial_balance
            : 0,
        current_balance:
          typeof account.current_balance === "number"
            ? account.current_balance
            : account.initial_balance || 0,
      }));
      setAccounts(validatedAccounts);
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AccountForm) => {
    try {
      setSubmitting(true);

      if (editingAccount) {
        // Calcular a diferença no saldo inicial e ajustar o saldo atual
        const balanceDifference =
          data.initial_balance - editingAccount.initial_balance;
        const newCurrentBalance =
          editingAccount.current_balance + balanceDifference;

        const { error } = await supabase
          .from("accounts")
          .update({
            name: data.name,
            type: data.type,
            initial_balance: data.initial_balance,
            current_balance: newCurrentBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAccount.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert({
          user_id: user!.id,
          name: data.name,
          type: data.type,
          initial_balance: data.initial_balance,
          current_balance: data.initial_balance,
        });

        if (error) throw error;
      }

      await loadAccounts();
      setIsModalOpen(false);
      setEditingAccount(null);
      reset();
    } catch (error) {
      console.error("Error saving account:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setValue("name", account.name);
    setValue("type", account.type);
    setValue("initial_balance", account.initial_balance);
    setIsModalOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Deseja realmente excluir esta conta?")) return;

    try {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
      await loadAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const openModal = () => {
    setEditingAccount(null);
    reset();
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

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find((t) => t.value === type);
    return accountType?.icon || Wallet;
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-600 mt-2">
            Gerencie suas contas bancárias e carteiras
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta</span>
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma conta encontrada
          </h3>
          <p className="text-gray-600 mb-6">
            Crie sua primeira conta para começar a gerenciar suas finanças
          </p>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Criar Conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const IconComponent = getAccountIcon(account.type);
            return (
              <div
                key={account.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {account.name}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {
                          accountTypes.find((t) => t.value === account.type)
                            ?.label
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Saldo Atual</span>
                    <span className="font-semibold text-lg text-gray-900">
                      {formatCurrency(account.current_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Saldo Inicial</span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(account.initial_balance)}
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
              {editingAccount ? "Editar Conta" : "Nova Conta"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Conta
                </label>
                <input
                  {...register("name", { required: "Nome é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Banco do Brasil"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Conta
                </label>
                <select
                  {...register("type", { required: "Tipo é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o tipo</option>
                  {accountTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Inicial
                </label>
                <input
                  {...register("initial_balance", {
                    required: "Saldo inicial é obrigatório",
                    valueAsNumber: true,
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {errors.initial_balance && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.initial_balance.message}
                  </p>
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
                    : editingAccount
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
