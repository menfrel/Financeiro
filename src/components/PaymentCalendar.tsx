import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientPayment } from '../types/patients';
import { DollarSign, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface PaymentCalendarProps {
  payments: PatientPayment[];
  currentMonth: Date;
  onPaymentClick: (payment: PatientPayment) => void;
}

export function PaymentCalendar({ payments, currentMonth, onPaymentClick }: PaymentCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPaymentsForDay = (day: Date) => {
    return payments.filter(payment => 
      isSameDay(parseISO(payment.payment_date), day)
    );
  };

  const getStatusIcon = (status: PatientPayment['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="w-3 h-3 text-red-600" />;
      case 'cancelled':
        return <XCircle className="w-3 h-3 text-gray-600" />;
      default:
        return <DollarSign className="w-3 h-3 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PatientPayment['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header com dias da semana */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayPayments = getPaymentsForDay(day);
          const totalAmount = dayPayments.reduce((sum, payment) => sum + payment.amount, 0);
          
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-2 border-r border-b border-gray-100 ${
                isToday(day) ? 'bg-blue-50' : 'bg-white'
              } hover:bg-gray-50 transition-colors`}
            >
              {/* Número do dia */}
              <div className={`text-sm font-medium mb-2 ${
                isToday(day) ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </div>

              {/* Pagamentos do dia */}
              <div className="space-y-1">
                {dayPayments.slice(0, 3).map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => onPaymentClick(payment)}
                    className={`w-full text-left p-1 rounded text-xs border transition-colors hover:shadow-sm ${getStatusColor(payment.status)}`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      {getStatusIcon(payment.status)}
                      <span className="font-medium truncate">
                        {payment.patient?.name || 'Paciente'}
                      </span>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </div>
                  </button>
                ))}

                {/* Mostrar indicador se houver mais pagamentos */}
                {dayPayments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{dayPayments.length - 3} mais
                  </div>
                )}

                {/* Total do dia */}
                {dayPayments.length > 0 && (
                  <div className="text-xs font-semibold text-gray-700 pt-1 border-t border-gray-200">
                    Total: {formatCurrency(totalAmount)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}