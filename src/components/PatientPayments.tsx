import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit2, 
  Trash2, 
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  CreditCard,
  Repeat,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { PaymentCalendar } from './PaymentCalendar';
import { MonthlyPaymentsView } from './MonthlyPaymentsView';
import { RecurringPaymentGenerator } from '../utils/recurringPayments';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Session {
  id: string;
  patient_id: string;
  session_date: string;
  duration_minutes: number;
  session_type: string;
  status: string;
}

interface PatientPayment {
  id: string;
  patient_id: string;
  session_id?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  status: string;
  transaction_id?: string;
  is_recurring: boolean;
  recurring_frequency?: 'weekly' | 'monthly';
  recurring_until?: string;
  recurring_day?: number;
  parent_payment_id?: string;
  patient?: Patient;
  session?: Session;
}

interface PaymentFormData {
  patient_id: string;
  session_id?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  status: string;
  is_recurring: boolean;
  recurring_frequency?: 'weekly' | 'monthly';
  recurring_until?: string;
  recurring_day?: number;
}

export function PatientPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PatientPayment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<PatientPayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [calendarView, setCalendarView] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PaymentFormData>({
    defaultValues: {
      payment_method: 'cash',
      status: 'pending',
      is_recurring: false
    }
  });

  const watchedPatientId = watch('patient_id');
  const watchedIsRecurring = watch('is_recurring');

  useEffect(() => {
    if (user) {
      loadPayments();
      loadPatients();
    }
  }, [user]);

  useEffect(() => {
    if (watchedPatientId) {
      loadSessionsForPatient(watchedPatientId);
    } else {
      setSessions([]);
    }
  }, [watchedPatientId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_payments')
        .select(`
          *,
          patient:patients(id, name, email, phone),
          session:sessions(id, session_date, duration_minutes, session_type, status)
        `)
        .eq('user_id', user?.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecurringPayments = async () => {
    try {
      if (user?.id) {
        await RecurringPaymentGenerator.forceGenerateRecurringPayments(user.id);
        await loadPayments();
      }
    } catch (error) {
      console.error('Error generating recurring payments:', error);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadSessionsForPatient = async (patientId: string) => {
    if (!patientId) return;
    
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, patient_id, session_date, duration_minutes, session_type, status')
        .eq('user_id', user?.id)
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions(data || []);
      console.log(`Loaded ${data?.length || 0} sessions for patient ${patientId}`);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const paymentData = {
        ...data,
        user_id: user?.id,
        amount: Number(data.amount),
        session_id: data.session_id || null,
        recurring_day: data.is_recurring ? Number(data.recurring_day) : null,
        recurring_frequency: data.is_recurring ? data.recurring_frequency : null,
        recurring_until: data.is_recurring && data.recurring_until && data.recurring_until !== '' ? data.recurring_until : null
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('patient_payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('patient_payments')
          .insert([paymentData]);

        if (error) throw error;
      }

      await loadPayments();
      setShowModal(false);
      setEditingPayment(null);
      reset();
    } catch (error) {
      console.error('Error saving payment:', error);
    }
  };

  const handleEdit = (payment: PatientPayment) => {
    setEditingPayment(payment);
    setValue('patient_id', payment.patient_id);
    setValue('session_id', payment.session_id || '');
    setValue('amount', payment.amount);
    setValue('payment_date', payment.payment_date);
    setValue('payment_method', payment.payment_method);
    setValue('description', payment.description || '');
    setValue('status', payment.status);
    setValue('is_recurring', payment.is_recurring);
    setValue('recurring_frequency', payment.recurring_frequency || 'monthly');
    setValue('recurring_until', payment.recurring_until || '');
    setValue('recurring_day', payment.recurring_day || 1);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;

    try {
      const { error } = await supabase
        .from('patient_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const createTransactionFromPayment = async (payment: PatientPayment) => {
    try {
      // Buscar ou criar categoria para pagamentos de pacientes
      let { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user?.id)
        .eq('name', 'Pagamentos de Pacientes')
        .eq('type', 'income')
        .single();

      if (!category) {
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            user_id: user?.id,
            name: 'Pagamentos de Pacientes',
            type: 'income',
            color: '#10B981'
          })
          .select('id')
          .single();

        if (categoryError) throw categoryError;
        category = newCategory;
      }

      // Buscar primeira conta do usuário
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (!accounts || accounts.length === 0) {
        throw new Error('Nenhuma conta encontrada. Crie uma conta primeiro.');
      }

      // Criar transação
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          account_id: accounts[0].id,
          category_id: category.id,
          amount: payment.amount,
          type: 'income',
          description: `Pagamento - ${payment.patient?.name || 'Paciente'}`,
          date: payment.payment_date,
        })
        .select('id')
        .single();

      if (transactionError) throw transactionError;

      // Atualizar o pagamento com o ID da transação
      const { error: updateError } = await supabase
        .from('patient_payments')
        .update({ transaction_id: transaction.id })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      return transaction.id;
    } catch (error) {
      console.error('Error creating transaction from payment:', error);
      throw error;
    }
  };

  const handleStatusChange = async (id: string, newStatus: PatientPayment['status']) => {
    try {
      const payment = payments.find(p => p.id === id);
      
      // Se está marcando como pago, criar transação
      if (newStatus === 'paid' && payment) {
        await createTransactionFromPayment(payment);
      }

      // Atualizar status do pagamento
      const { error } = await supabase
        .from('patient_payments')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Recarregar dados
      await loadPayments();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Erro ao atualizar status do pagamento');
    }
  };

  const handleView = (payment: PatientPayment) => {
    setViewingPayment(payment);
    setShowViewModal(true);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'transfer': return <TrendingUp className="w-4 h-4" />;
      case 'pix': return <TrendingDown className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'transfer': return 'Transferência';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const navigateMonth = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentMonth(new Date());
    } else {
      const newMonth = new Date(currentMonth);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      setCurrentMonth(newMonth);
    }
  };

  const openModal = () => {
    setEditingPayment(null);
    reset();
    setValue('payment_date', format(new Date(), 'yyyy-MM-dd'));
    setShowModal(true);
  };

  // Calcular estatísticas
  const totalPaid = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPending = filteredPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalOverdue = filteredPayments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
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
        <button
          onClick={generateRecurringPayments}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Repeat className="w-4 h-4" />
          <span>Gerar Recorrentes</span>
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalPending)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Atraso</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOverdue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Toggle de Visualização */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Toggle de Visualização */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCalendarView("list")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                calendarView === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
            <button
              onClick={() => setCalendarView("calendar")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                calendarView === "calendar"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Mensal
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {calendarView === "list" ? (
        /* Visualização em Lista */
        filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' 
                ? "Nenhum pagamento encontrado" 
                : "Nenhum pagamento cadastrado"
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? "Tente ajustar os filtros de busca"
                : "Cadastre o primeiro pagamento para começar"
              }
            </p>
            <button
              onClick={openModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Novo Pagamento
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Todos os Pagamentos
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredPayments
                .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
                .map((payment) => {
                  const today = new Date();
                  const paymentDate = new Date(payment.payment_date + 'T00:00:00');
                  const isOverdue = payment.status === 'pending' && today > paymentDate;

                  return (
                    <div
                      key={payment.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {payment.patient?.name || 'Paciente não encontrado'}
                              </h4>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                  isOverdue ? 'bg-red-100 text-red-800 border-red-200' : getStatusColor(payment.status)
                                }`}
                              >
                                {isOverdue ? <AlertTriangle className="w-3 h-3 mr-1" /> : getStatusIcon(payment.status)}
                                {isOverdue ? 'Atrasado' : getStatusLabel(payment.status)}
                              </span>
                              {payment.is_recurring && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Repeat className="w-3 h-3 mr-1" />
                                  Recorrente
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(payment.payment_date)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(payment.amount)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="capitalize">{getPaymentMethodLabel(payment.payment_method)}</span>
                              </div>
                            </div>

                            {payment.description && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">{payment.description}</p>
                              </div>
                            )}

                            {payment.session && (
                              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Sessão:</strong> {formatDateTime(payment.session.session_date)} - {payment.session.session_type}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center space-x-2">
                          {/* Botões de Status */}
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(payment.id, 'paid')}
                              className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Marcar como Pago</span>
                            </button>
                          )}

                          {payment.status === 'pending' && isOverdue && (
                            <button
                              onClick={() => handleStatusChange(payment.id, 'overdue')}
                              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>Marcar Atrasado</span>
                            </button>
                          )}

                          {payment.status === 'overdue' && (
                            <button
                              onClick={() => handleStatusChange(payment.id, 'paid')}
                              className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Marcar como Pago</span>
                            </button>
                          )}

                          {/* Botões de Ação Padrão */}
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleView(payment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(payment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )
      ) : (
        /* Visualização em Calendário */
        <MonthlyPaymentsView
          payments={filteredPayments}
          onPaymentClick={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Modal Adicionar/Editar Pagamento */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paciente *
                  </label>
                  <select
                    {...register('patient_id', { required: 'Paciente é obrigatório' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                  {errors.patient_id && (
                    <p className="text-red-600 text-sm mt-1">{errors.patient_id.message}</p>
                  )}
                </div>

                {watchedPatientId && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sessão (opcional)
                    </label>
                    <select
                      {...register('session_id')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loadingSessions}
                    >
                      <option value="">
                        {loadingSessions ? 'Carregando sessões...' : 'Selecione uma sessão (opcional)'}
                      </option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {formatDateTime(session.session_date)} - {session.session_type} ({session.status})
                        </option>
                      ))}
                    </select>
                    {sessions.length === 0 && !loadingSessions && watchedPatientId && (
                      <p className="text-gray-500 text-sm mt-1">Nenhuma sessão encontrada para este paciente</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount', { 
                      required: 'Valor é obrigatório',
                      min: { value: 0.01, message: 'Valor deve ser maior que zero' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                  {errors.amount && (
                    <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    {...register('payment_date', { required: 'Data é obrigatória' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.payment_date && (
                    <p className="text-red-600 text-sm mt-1">{errors.payment_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pagamento
                  </label>
                  <select
                    {...register('payment_method')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="card">Cartão</option>
                    <option value="transfer">Transferência</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Atrasado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição opcional do pagamento"
                  />
                </div>

                {/* Opções de Pagamento Recorrente */}
                <div className="md:col-span-2 border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      {...register('is_recurring')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Pagamento Recorrente
                    </label>
                  </div>

                  {watchedIsRecurring && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-blue-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequência *
                        </label>
                        <select
                          {...register('recurring_frequency', { 
                            required: watchedIsRecurring ? 'Frequência é obrigatória' : false 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                        {errors.recurring_frequency && (
                          <p className="text-red-600 text-sm mt-1">{errors.recurring_frequency.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dia do Pagamento *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          {...register('recurring_day', { 
                            required: watchedIsRecurring ? 'Dia é obrigatório' : false,
                            min: { value: 1, message: 'Dia deve ser entre 1 e 31' },
                            max: { value: 31, message: 'Dia deve ser entre 1 e 31' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 5"
                        />
                        {errors.recurring_day && (
                          <p className="text-red-600 text-sm mt-1">{errors.recurring_day.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repetir até (opcional)
                        </label>
                        <input
                          type="date"
                          {...register('recurring_until')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPayment(null);
                    reset();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingPayment ? 'Atualizar' : 'Criar'} Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizar Pagamento */}
      {showViewModal && viewingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes do Pagamento</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {viewingPayment.patient?.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingPayment.status)}`}
                  >
                    {getStatusIcon(viewingPayment.status)}
                    <span className="ml-1">{getStatusLabel(viewingPayment.status)}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Informações do Pagamento</h4>

                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-gray-600">Valor:</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(viewingPayment.amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <p className="text-gray-900">{formatDate(viewingPayment.payment_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getPaymentMethodIcon(viewingPayment.payment_method)}
                    <div>
                      <span className="text-gray-600">Método:</span>
                      <p className="text-gray-900">{getPaymentMethodLabel(viewingPayment.payment_method)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Informações Adicionais</h4>

                  {viewingPayment.session && (
                    <div>
                      <span className="text-gray-600">Sessão:</span>
                      <p className="text-gray-900">
                        {formatDateTime(viewingPayment.session.session_date)} - {viewingPayment.session.session_type}
                      </p>
                    </div>
                  )}

                  {viewingPayment.description && (
                    <div>
                      <span className="text-gray-600">Descrição:</span>
                      <p className="text-gray-900">{viewingPayment.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {viewingPayment.is_recurring && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <Repeat className="w-5 h-5" />
                    <span>Configuração de Recorrência</span>
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-blue-800">
                      <strong>Frequência:</strong> {viewingPayment.recurring_frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Dia:</strong> Todo dia {viewingPayment.recurring_day}
                    </p>
                    {viewingPayment.recurring_until && (
                      <p className="text-sm text-blue-800">
                        <strong>Até:</strong> {formatDate(viewingPayment.recurring_until)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(viewingPayment);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Editar Pagamento
              </button>
              <button
                onClick={() => setShowViewModal(false)}
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