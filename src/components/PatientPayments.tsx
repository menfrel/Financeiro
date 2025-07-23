import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Home,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PaymentCalendar } from './PaymentCalendar';
import { RecurringPaymentGenerator } from '../utils/recurringPayments';

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
      RecurringPaymentGenerator.initializeRecurringPayments(user.id);
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
        recurring_until: data.is_recurring && data.recurring_until ? data.recurring_until : null
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos de Pacientes</h1>
          <p className="text-gray-600">Gerencie os pagamentos dos seus pacientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Pagamento
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por paciente ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCalendarView("list")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              calendarView === "list"
                ? "bg-white text-indigo-600 shadow-sm"
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
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Mensal
          </button>
        </div>
      </div>

      {/* Calendar Navigation (only show in calendar view) */}
      {calendarView === "calendar" && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateMonth('today')}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              Hoje
            </button>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Content */}
      {calendarView === "list" ? (
        /* List View */
        <div className="bg-white rounded-lg border border-gray-200">
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pagamento encontrado</h3>
              <p className="text-gray-600">Comece criando um novo pagamento para seus pacientes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {payment.patient?.name}
                            {payment.is_recurring && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Recorrente
                              </span>
                            )}
                          </div>
                          {payment.description && (
                            <div className="text-sm text-gray-500">{payment.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status === 'paid' ? 'Pago' :
                           payment.status === 'pending' ? 'Pendente' :
                           payment.status === 'overdue' ? 'Atrasado' : 'Cancelado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {payment.payment_method === 'cash' ? 'Dinheiro' :
                         payment.payment_method === 'card' ? 'Cartão' :
                         payment.payment_method === 'transfer' ? 'Transferência' :
                         payment.payment_method === 'pix' ? 'PIX' : payment.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(payment)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(payment)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Calendar View */
        <PaymentCalendar
          payments={filteredPayments}
          currentMonth={currentMonth}
          onPaymentClick={handleView}
        />
      )}

      {/* Add/Edit Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paciente *
                  </label>
                  <select
                    {...register('patient_id', { required: 'Paciente é obrigatório' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sessão (opcional)
                    </label>
                    <select
                      {...register('session_id')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Atrasado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Descrição opcional do pagamento"
                  />
                </div>

                {/* Recurring Payment Options */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      {...register('is_recurring')}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Pagamento Recorrente
                    </label>
                  </div>

                  {watchedIsRecurring && (
                    <div className="space-y-4 pl-6 border-l-2 border-indigo-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequência *
                        </label>
                        <select
                          {...register('recurring_frequency', { 
                            required: watchedIsRecurring ? 'Frequência é obrigatória' : false 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Ex: 5 (todo dia 5)"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-gray-500 text-sm mt-1">
                          Deixe em branco para repetir indefinidamente
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                  >
                    {editingPayment ? 'Atualizar' : 'Criar'} Pagamento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPayment(null);
                      reset();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {showViewModal && viewingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Pagamento</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Paciente</label>
                  <p className="text-gray-900">{viewingPayment.patient?.name}</p>
                </div>

                {viewingPayment.session && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Sessão</label>
                    <p className="text-gray-900">
                      {formatDateTime(viewingPayment.session.session_date)} - {viewingPayment.session.session_type}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500">Valor</label>
                  <p className="text-gray-900 font-semibold">{formatCurrency(viewingPayment.amount)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Data do Pagamento</label>
                  <p className="text-gray-900">{formatDate(viewingPayment.payment_date)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingPayment.status)}`}>
                    {getStatusIcon(viewingPayment.status)}
                    {viewingPayment.status === 'paid' ? 'Pago' :
                     viewingPayment.status === 'pending' ? 'Pendente' :
                     viewingPayment.status === 'overdue' ? 'Atrasado' : 'Cancelado'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Método de Pagamento</label>
                  <p className="text-gray-900 capitalize">
                    {viewingPayment.payment_method === 'cash' ? 'Dinheiro' :
                     viewingPayment.payment_method === 'card' ? 'Cartão' :
                     viewingPayment.payment_method === 'transfer' ? 'Transferência' :
                     viewingPayment.payment_method === 'pix' ? 'PIX' : viewingPayment.payment_method}
                  </p>
                </div>

                {viewingPayment.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Descrição</label>
                    <p className="text-gray-900">{viewingPayment.description}</p>
                  </div>
                )}

                {viewingPayment.is_recurring && (
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Configuração de Recorrência</label>
                    <div className="bg-blue-50 p-3 rounded-lg space-y-1">
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

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingPayment);
                  }}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}