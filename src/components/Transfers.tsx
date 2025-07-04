import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  ArrowRightLeft,
  Search,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
}

interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  from_account: { name: string };
  to_account: { name: string };
}

interface TransferForm {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  date: string;
}

export function Transfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransferForm>();

  const watchFromAccount = watch("from_account_id");

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

      // Carregar contas
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      // Carregar transferências
      const { data: transfersData } = await supabase
        .from("transfers")
        .select(`
          *,
          from_account:accounts!transfers_from_account_id_fkey(name),
          to_account:accounts!transfers_to_account_id_fkey(name)
        `)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      setAccounts(accountsData || []);
      setTransfers(transfersData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    try {
      setSubmitting(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      if (data.from_account_id === data.to_account_id) {
        alert("Conta de origem e destino devem ser diferentes");
        return;
      }

      // Verificar saldo da conta de origem
      const fromAccount = accounts.find(acc => acc.id === data.from_account_id);
      if (!fromAccount || fromAccount.current_balance < data.amount) {
        alert("Saldo insuficiente na conta de origem");
        return;
      }

      // Criar transferência
      const { error: transferError } = await supabase
        .from("transfers")
        .insert({
          user_id: user.id,
          from_account_id: data.from_account_id,
          to_account_id: data.to_account_id,
          amount: data.amount,
          description: data.description,
          date: data.date,
        });

      if (transferError) throw transferError;

      // Atualizar saldos das contas
      const { error: fromAccountError } = await supabase
        .from("accounts")
        .update({
          current_balance: fromAccount.current_balance - data.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.from_account_id);

      if (fromAccountError) throw fromAccountError;

      const toAccount = accounts.find(acc => acc.id === data.to_account_id);
      if (toAccount) {
        const { error: toAccountError } = await supabase
          .from("accounts")
          .update({
            current_balance: toAccount.current_balance + data.amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.to_account_id);

        if (toAccountError) throw toAccountError;
      }

      await loadData();
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error("Error creating transfer:", error);
      alert("Erro ao realizar transferência");
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    reset();
    setValue("date", format(new Date(), "yyyy-MM-dd"));
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredTransfers = transfers.filter((transfer) =>
    transfer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.from_account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.to_account.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableToAccounts = accounts.filter(
    (account) => account.id !== watchFromAccount
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
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transferências</h1>
          <p className="text-gray-600 mt-2">
            Transfira dinheiro entre suas contas
          </p>
        </div>
        
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Transferência</span>
        </button>
      </div>

      {/* Resumo das Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{account.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {account.type.replace("_", " ")}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(account.current_balance)}
              </p>
              <p className="text-sm text-gray-500">Saldo disponível</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar transferências..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Lista de Transferências */}
      {filteredTransfers.length === 0 ? (
        <div className="text-center py-12">
          <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "Nenhuma transferência encontrada" : "Nenhuma transferência realizada"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? "Tente ajustar o termo de busca" 
              : "Realize sua primeira transferência entre contas"
            }
          </p>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Nova Transferência
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransfers.map((transfer) => (
            <div
              key={transfer.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <ArrowRightLeft className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {transfer.description}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>{transfer.from_account.name}</span>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{transfer.to_account.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {format(parse(transfer.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(transfer.amount)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">
                      Concluída
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Nova Transferência
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta de Origem
                </label>
                <select
                  {...register("from_account_id", {
                    required: "Conta de origem é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a conta de origem</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
                {errors.from_account_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.from_account_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta de Destino
                </label>
                <select
                  {...register("to_account_id", {
                    required: "Conta de destino é obrigatória",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a conta de destino</option>
                  {availableToAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {errors.to_account_id && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.to_account_id.message}
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
                  placeholder="Ex: Transferência para poupança"
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
                  {submitting ? "Transferindo..." : "Transferir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}