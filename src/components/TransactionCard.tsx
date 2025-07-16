import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  CreditCard, 
  Tag, 
  Edit2, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Repeat
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  is_recurring: boolean;
  recurring_frequency?: 'weekly' | 'monthly' | null;
  recurring_until?: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
}

interface TransactionCardProps {
  transaction: Transaction;
  isDetailed: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionCard({ transaction, isDetailed, onEdit, onDelete }: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(parse(dateString, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (!isDetailed) {
    // Layout Resumido - Minimalista e Clean
    return (
      <div className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Icon with subtle animation */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
              transaction.type === 'income' 
                ? 'bg-gradient-to-br from-emerald-50 to-green-100 text-emerald-600' 
                : 'bg-gradient-to-br from-rose-50 to-red-100 text-rose-600'
            }`}>
              {transaction.type === 'income' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 truncate text-sm">
                  {transaction.description}
                </h3>
                {transaction.is_recurring && (
                  <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    <Repeat className="w-3 h-3" />
                    <span className="text-xs font-medium">Recorrente</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {transaction.category && (
                  <div className="flex items-center space-x-1">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: transaction.category.color }}
                    />
                    <span className="text-xs text-gray-500 truncate">
                      {transaction.category.name}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {formatDate(transaction.date)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount and Actions */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className={`font-bold text-lg ${
                transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>

            {/* Actions - Hidden by default, shown on hover */}
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => onEdit(transaction)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(transaction.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Layout Detalhado - Expandido e Informativo
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Main Content */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* Enhanced Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
              transaction.type === 'income' 
                ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white' 
                : 'bg-gradient-to-br from-rose-400 to-red-500 text-white'
            }`}>
              {transaction.type === 'income' ? (
                <ArrowUpRight className="w-7 h-7" />
              ) : (
                <ArrowDownRight className="w-7 h-7" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {transaction.description}
                </h3>
                {transaction.is_recurring && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full border border-blue-200">
                    <Repeat className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {transaction.recurring_frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {format(parse(transaction.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy - EEEE', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {transaction.category && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm" 
                      style={{ backgroundColor: transaction.category.color }}
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Categoria</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction.category.name}</p>
                    </div>
                  </div>
                )}

                {transaction.account && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conta</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction.account.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Amount and Actions */}
          <div className="flex flex-col items-end space-y-4">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {transaction.type === 'income' ? 'Receita' : 'Despesa'}
              </p>
              <p className={`text-3xl font-bold ${
                transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(transaction)}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors font-medium"
              >
                <Edit2 className="w-4 h-4" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => onDelete(transaction.id)}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Section for Recurring Details */}
        {transaction.is_recurring && (
          <div className="mt-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Detalhes da Recorrência</span>
            </button>
            
            {isExpanded && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Frequência</p>
                    <p className="text-blue-700">
                      {transaction.recurring_frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                    </p>
                  </div>
                  {transaction.recurring_until && (
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Até</p>
                      <p className="text-blue-700">{formatDate(transaction.recurring_until)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}