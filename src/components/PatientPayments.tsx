import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PatientPayment,
  PatientPaymentForm,
  Patient,
  Session,
} from "../types/patients";
import { RecurringPaymentGenerator } from "../utils/recurringPayments";
import { PaymentCalendar } from "./PaymentCalendar";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export function PatientPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PatientPayment | null>(
    null,
  );
  const [viewingPayment, setViewingPayment] = useState<PatientPayment | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [patientFilter, setPatientFilter] = useState<string>("");

  const [calendarView, setCalendarView] = useState<"list" | "calendar">("list");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientPaymentForm>();

  const watchPatientId = watch("patient_id");
  const watchCreateTransaction = watch("create_transaction");

  useEffect(() => {
    if (user) {
      loadData();
      // Inicializar geração de pagamentos recorrentes
      RecurringPaymentGenerator.initializeRecurringPayments(user.id);
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

      // Carregar pacientes
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (patientsError) {
        console.error("Error loading patients:", patientsError);
      }

      // Carregar sessões
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false });

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
      }

      // Carregar pagamentos com dados do paciente e sessão
      // Primeiro carregar os pagamentos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("patient_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false });

      if (paymentsError) {
        console.error("Error loading payments:", paymentsError);
        setPayments([]);
      } else {
        
        // Depois carregar os dados relacionados e fazer merge manual
        if (paymentsData && paymentsData.length > 0) {
          const patientIds = [...new Set(paymentsData.map(p => p.patient_id))];
          const sessionIds = [...new Set(paymentsData.map(p => p.session_id).filter(Boolean))];
          
          const [patientsForPayments, sessionsForPayments] = await Promise.all([
            supabase
              .from("patients")
              .select("id, name, email, phone")
              .in("id", patientIds),
            sessionIds.length > 0 
              ? supabase
                  .from("sessions")
                  .select("id, session_date, session_type")
                  .in("id", sessionIds)
              : Promise.resolve({ data: [] })
          ]);

          // Fazer merge manual dos dados
          const paymentsWithRelations = paymentsData.map(payment => ({
            ...payment,
            patient: patientsForPayments.data?.find(p => p.id === payment.patient_id) || null,
            session: payment.session_id 
              ? sessionsForPayments.data?.find(s => s.id === payment.session_id) || null 
              : null
          }));

          setPayments(paymentsWithRelations);
        } else {
          setPayments([]);
        }
      }

      // Carregar contas
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (accountsError) {
        console.error("Error loading accounts:", accountsError);
      }

      // Carregar categorias de receita
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "income")
        .order("name", { ascending: true });

      if (categoriesError) {
      }

      setPatients(patientsData || []);
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      setPayments([]);
      setPatients([]);
      setSessions([]);
      setAccounts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const ensurePatientPaymentCategory = async () => {
    try {
      // Verificar se já existe uma categoria "Pagamentos de Pacientes"
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user!.id)
        .eq("name", "Pagamentos de Pacientes")
        .eq("type", "income")
        .single();

      if (existingCategory) {
        return existingCategory.id;
      }

      // Criar a categoria se não existir
      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({
          user_id: user!.id,
          name: "Pagamentos de Pacientes",
          type: "income",
          color: "#10B981", // Verde
        })
        .select()
        .single();

      if (error) throw error;
      return newCategory.id;
    } catch (error) {
      console.error("Error ensuring patient payment category:", error);
      return null;
    }
  };

  const onSubmit = async (data: PatientPaymentForm) => {
    try {
      setSubmitting(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      const paymentData = {
        user_id: user.id,
        patient_id: data.patient_id,
        session_id: data.session_id || null,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        description: data.description || null,
        status: data.status,
      };

      let paymentId: string;

      if (editingPayment) {
        const { error } = await supabase
          .from("patient_payments")
          .update(paymentData)
          .eq("id", editingPayment.id)
          .eq("user_id", user.id);

        if (error) throw error;
        paymentId = editingPayment.id;
      } else {
        const { data: newPayment, error } = await supabase
          .from("patient_payments")
          .insert(paymentData)
          .select()
          .single();

        if (error) throw error;
        paymentId = newPayment.id;
      }

      // Criar transação financeira se solicitado
      if (
        data.create_transaction &&
        data.account_id &&
        data.status === "paid"
      ) {
        const categoryId = await ensurePatientPaymentCategory();

        if (categoryId) {
          const patient = patients.find((p) => p.id === data.patient_id);
          const transactionDescription =
            data.description || `Pagamento - ${patient?.name || "Paciente"}`;

          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              user_id: user.id,
              account_id: data.account_id,
              category_id: categoryId,
              amount: data.amount,
              type: "income",
              description: transactionDescription,
              date: data.payment_date,
              is_recurring: false,
            });

          if (transactionError) {
            console.error("Error creating transaction:", transactionError);
          } else {
            // Atualizar o payment com o ID da transação
            await supabase
              .from("patient_payments")
              .update({ transaction_id: paymentId })
              .eq("id", paymentId);
          }
        }
      }

      await loadData();
      setIsModalOpen(false);
      setEditingPayment(null);
      reset();
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Erro ao salvar pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (payment: PatientPayment) => {
    setEditingPayment(payment);
    setValue("patient_id", payment.patient_id);
    setValue("session_id", payment.session_id || "");
    setValue("amount", payment.amount);
    setValue("payment_date", payment.payment_date);
    setValue("payment_method", payment.payment_method);
    setValue("description", payment.description || "");
    setValue("status", payment.status);
    setValue("create_transaction", false);
    setIsModalOpen(true);
  };

  const handleView = (payment: PatientPayment) => {
    setViewingPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (paymentId: string) => {
    if (
      !confirm(
        "Deseja realmente excluir este pagamento? Esta ação não pode ser desfeita.",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("patient_payments")
        .delete()
        .eq("id", paymentId)
        .eq("user_id", user!.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Erro ao excluir pagamento");
    }
  };

  const handleStatusChange = async (
    paymentId: string,
    newStatus: PatientPayment["status"],
  ) => {
    try {
      // Atualiza o status normalmente
      const { error } = await supabase
        .from("patient_payments")
        .update({ status: newStatus })
        .eq("id", paymentId)
        .eq("user_id", user!.id);

      if (error) throw error;

      // Se marcar como pago, criar categoria e lançamento financeiro
      if (newStatus === "paid") {
        // Busca o pagamento atualizado
        const { data: paymentData, error: paymentError } = await supabase
          .from("patient_payments")
          .select("*")
          .eq("id", paymentId)
          .eq("user_id", user!.id)
          .single();
        if (paymentError || !paymentData) throw paymentError;

        // Busca paciente
        const patient = patients.find((p) => p.id === paymentData.patient_id);
        // Usa a primeira conta cadastrada
        const account = accounts[0];
        if (!account) {
          alert("Nenhuma conta cadastrada. Cadastre uma conta para lançar o pagamento no financeiro.");
          await loadData();
          return;
        }
        // Garante categoria
        const categoryId = await ensurePatientPaymentCategory();
        if (categoryId) {
          const transactionDescription = paymentData.description || `Pagamento - ${patient?.name || "Paciente"}`;
          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              user_id: user!.id,
              account_id: account.id,
              category_id: categoryId,
              amount: paymentData.amount,
              type: "income",
              description: transactionDescription,
              date: paymentData.payment_date,
              is_recurring: false,
            });
          if (transactionError) {
            console.error("Erro ao criar lançamento financeiro:", transactionError);
          } else {
            // Opcional: atualizar o payment com o ID da transação
          }
        }
      }
      await loadData();
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Erro ao atualizar status do pagamento");
    }
  };

  const openModal = () => {
    setEditingPayment(null);
    reset();
    setValue("payment_date", format(new Date(), "yyyy-MM-dd"));
    setValue("status", "pending");
    setValue("payment_method", "cash");
    setValue("create_transaction", true);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: PatientPayment["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: PatientPayment["status"]) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "pending":
        return "Pendente";
      case "overdue":
        return "Atrasado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: PatientPayment["status"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      (payment.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.description &&
        payment.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || payment.status === statusFilter;
    const matchesPatient =
      !patientFilter || payment.patient_id === patientFilter;
    return matchesSearch && matchesStatus && matchesPatient;
  });

  const patientSessions = sessions.filter(
    (session) => session.patient_id === watchPatientId,
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
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os pagamentos dos seus pacientes
          </p>
        </div>

        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pagamento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filtros e Busca</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pagamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os pacientes</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Atrasado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Lista de Pagamentos */}
      {viewMode === "monthly" && calendarView === "calendar" ? (
        <PaymentCalendar
          payments={getMonthlyPayments()}
          currentMonth={currentMonth}
          onPaymentClick={handleView}
        />
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter || patientFilter
              ? "Nenhum pagamento encontrado"
              : "Nenhum pagamento registrado"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter || patientFilter
              ? "Tente ajustar os filtros de busca"
              : "Registre seu primeiro pagamento para começar"}
          </p>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Registrar Pagamento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
            const paymentDate = new Date(payment.payment_date);

            return (
              <div
                key={payment.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                      {getStatusIcon(payment.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {payment.patient?.name || 'Paciente não encontrado'}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium text-lg text-gray-900">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(paymentDate, "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="capitalize">
                            {payment.payment_method}
                          </span>
                        </div>
                      </div>

                      {payment.description && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {payment.description}
                          </p>
                        </div>
                      )}

                      {payment.session && (
                        <div className="mt-2 text-sm text-gray-500">
                          Sessão:{" "}
                          {format(
                            new Date(payment.session.session_date),
                            "dd/MM/yyyy",
                            { locale: ptBR },
                          )}{" "}
                          - {payment.session.session_type}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleView(payment)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(payment)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                  {payment.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(payment.id, "paid")}
                        className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Marcar como Pago</span>
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(payment.id, "overdue")
                        }
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Marcar Atrasado</span>
                      </button>
                    </>
                  )}
                  {payment.status === "overdue" && (
                    <button
                      onClick={() => handleStatusChange(payment.id, "paid")}
                      className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Marcar como Pago</span>
                    </button>
                  )}
                  {payment.status !== "cancelled" && (
                    <button
                      onClick={() =>
                        handleStatusChange(payment.id, "cancelled")
                      }
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingPayment ? "Editar Pagamento" : "Novo Pagamento"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paciente *
                  </label>
                  <select
                    {...register("patient_id", {
                      required: "Paciente é obrigatório",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                  {errors.patient_id && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.patient_id.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor *
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
                    Data do Pagamento *
                  </label>
                  <input
                    {...register("payment_date", {
                      required: "Data é obrigatória",
                    })}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.payment_date && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.payment_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    {...register("payment_method", {
                      required: "Forma de pagamento é obrigatória",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="bank_transfer">
                      Transferência Bancária
                    </option>
                    <option value="pix">PIX</option>
                    <option value="check">Cheque</option>
                  </select>
                  {errors.payment_method && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.payment_method.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    {...register("status", {
                      required: "Status é obrigatório",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Atrasado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                  {errors.status && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.status.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição adicional do pagamento"
                  />
                </div>

                {/* Integração com sistema financeiro */}
                <div className="md:col-span-2 border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Integração Financeira
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        {...register("create_transaction")}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Criar lançamento no sistema financeiro
                      </span>
                    </label>

                    {watchCreateTransaction && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Conta para Lançamento
                        </label>
                        <select
                          {...register("account_id", {
                            required: watchCreateTransaction
                              ? "Conta é obrigatória"
                              : false,
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione a conta</option>
                          {accounts.length === 0 ? (
                            <option disabled>Nenhuma conta encontrada</option>
                          ) : (
                            accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} ({account.type})
                              </option>
                            ))
                          )}
                        </select>
                        {errors.account_id && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.account_id.message}
                          </p>
                        )}
                        {accounts.length === 0 && (
                          <p className="text-amber-600 text-sm mt-1">
                            ⚠️ Nenhuma conta encontrada. Cadastre uma conta
                            primeiro na seção "Contas".
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Uma categoria "Pagamentos de Pacientes" será criada
                          automaticamente se não existir.
                        </p>
                      </div>
                    )}
                  </div>
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
                    : editingPayment
                      ? "Atualizar"
                      : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualização */}
      {isViewModalOpen && viewingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes do Pagamento
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                  {getStatusIcon(viewingPayment.status)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatCurrency(viewingPayment.amount)}
                  </h3>
                  <p className="text-lg text-gray-600">
                    {viewingPayment.patient?.name}
                  </p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingPayment.status)}`}
                  >
                    {getStatusLabel(viewingPayment.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Informações do Pagamento
                  </h4>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {format(
                        new Date(viewingPayment.payment_date),
                        "dd/MM/yyyy",
                        { locale: ptBR },
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700 capitalize">
                      {viewingPayment.payment_method}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Informações do Paciente
                  </h4>

                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {viewingPayment.patient?.name}
                    </span>
                  </div>

                  {viewingPayment.patient?.email && (
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-700">
                        {viewingPayment.patient.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {viewingPayment.session && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Sessão Relacionada
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700">
                      {format(
                        new Date(viewingPayment.session.session_date),
                        "dd/MM/yyyy HH:mm",
                        { locale: ptBR },
                      )}{" "}
                      - {viewingPayment.session.session_type}
                    </p>
                  </div>
                </div>
              )}

              {viewingPayment.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Descrição
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {viewingPayment.description}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
                <p>
                  Registrado em:{" "}
                  {format(
                    new Date(viewingPayment.created_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )}
                </p>
                {viewingPayment.updated_at !== viewingPayment.created_at && (
                  <p>
                    Última atualização:{" "}
                    {format(
                      new Date(viewingPayment.updated_at),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewingPayment);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Editar Pagamento
              </button>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}