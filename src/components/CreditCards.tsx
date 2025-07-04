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
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
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
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
    formState: { errors: paymentErrors },
  } = useForm<PaymentForm>();

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
      const { data: transactionsData } = await supabase
        .from("credit_card_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      // Carregar contas para pagamento
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      setCreditCards(cardsData || []);
      setTransactions(transactionsData || []);
      setAccounts(accountsData || []);
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
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-gray-600 mt-2">
            Gerencie seus cartões e faturas
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={openTransactionModal}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            <span>Nova Compra</span>
          </button>
          <button
            onClick={openCardModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cartão</span>
          </button>
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const status = getCardStatus(card);
            const usagePercentage = (card.current_balance / card.limit_amount) * 100;
            
            return (
              <div
                key={card.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{card.name}</h3>
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

                <div className="space-y-4">
                  {/* Saldo Atual */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Fatura Atual</span>
                      <span className="font-semibold text-gray-900">
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
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => openPaymentModal(card.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Pagar Fatura
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCard(card.id);
                        openTransactionModal();
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Nova Compra
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}