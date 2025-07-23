import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientPayment {
  id: string;
  patient_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  is_recurring: boolean;
  patient?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

interface MonthlyStats {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  totalCancelled: number;
  paymentsCount: number;
  overdueCount: number;
}

interface MonthlyPaymentsViewProps {
  payments: PatientPayment[];
  onPaymentClick: (payment: PatientPayment) => void;
  onEdit: (payment: PatientPayment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: PatientPayment['status']) => void;
}

export function MonthlyPaymentsView({ 
  payments, 
  onPaymentClick, 
  onEdit, 
  onDelete,
  onStatusChange 
}: MonthlyPaymentsViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalCancelled: 0,
    paymentsCount: 0,
    overdueCount: 0
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusIcon = (status: PatientPayment['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PatientPayment['status']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: PatientPayment['status']) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  // Filtrar pagamentos do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const monthlyPayments = payments.filter(payment => {
    const paymentDate = parseISO(payment.payment_date);
    return paymentDate >= monthStart && paymentDate <= monthEnd;
  });

  // Calcular estatísticas do mês
  useEffect(() => {
    const stats = monthlyPayments.reduce((acc, payment) => {
      const today = new Date();
      const paymentDate = parseISO(payment.payment_date);
      
      switch (payment.status) {
        case 'paid':
          acc.totalReceived += payment.amount;
          break;
        case 'pending':
          if (isAfter(today, paymentDate)) {
            acc.totalOverdue += payment.amount;
            acc.overdueCount++;
          } else {
            acc.totalPending += payment.amount;
          }
          break;
        case 'overdue':
          acc.totalOverdue += payment.amount;
          acc.overdueCount++;
          break;
        case 'cancelled':
          acc.totalCancelled += payment.amount;
          break;
      }
      acc.paymentsCount++;
      return acc;
    }, {
      totalReceived: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalCancelled: 0,
      paymentsCount: 0,
      overdueCount: 0
    });

    setMonthlyStats(stats);
  }, [monthlyPayments.length, currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };


  return (
    <div className="space-y-6">
      {/* Navegação do Mês */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {monthlyStats.paymentsCount} pagamento(s) no mês
          </p>
        </div>

        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Cards de Estatísticas Mensais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlyStats.totalReceived)}
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
                {formatCurrency(monthlyStats.totalPending)}
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
                {formatCurrency(monthlyStats.totalOverdue)}
              </p>
              {monthlyStats.overdueCount > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  {monthlyStats.overdueCount} pagamento(s)
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ganho Líquido</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(monthlyStats.totalReceived)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Receita do mês
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Pagamentos do Mês */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Pagamentos de {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
        </div>

        {monthlyPayments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum pagamento neste mês
            </h3>
            <p className="text-gray-600">
              Não há pagamentos agendados para {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {monthlyPayments
              .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
              .map((payment) => {
                const today = new Date();
                const paymentDate = parseISO(payment.payment_date);
                const isOverdue = payment.status === 'pending' && isAfter(today, paymentDate);

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
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{format(paymentDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="capitalize">{payment.payment_method}</span>
                            </div>
                          </div>

                          {payment.description && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{payment.description}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center space-x-2">
                        {/* Botões de Status */}
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => onStatusChange(payment.id, 'paid')}
                            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Marcar como Pago</span>
                          </button>
                        )}

                        {payment.status === 'pending' && isOverdue && (
                          <button
                            onClick={() => onStatusChange(payment.id, 'overdue')}
                            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>Marcar Atrasado</span>
                          </button>
                        )}

                        {payment.status === 'overdue' && (
                          <button
                            onClick={() => onStatusChange(payment.id, 'paid')}
                            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Marcar como Pago</span>
                          </button>
                        )}

                        {/* Botões de Ação Padrão */}
                        <div className="flex space-x-1">
                          <button
                            onClick={() => onPaymentClick(payment)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(payment)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(payment.id)}
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
        )}
      </div>
    </div>
  );
}