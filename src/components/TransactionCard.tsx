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
            <div className="text-right min-w-[90px]">
              <p className={`font-bold text-lg ${
                transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatCurrency(transaction.type === 'income' ? transaction.amount : -transaction.amount)}
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

  // Layout Detalhado - Lista Compacta
  return (
    <div className="group bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300 flex items-center space-x-4">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
      {/* Descrição, Categoria e Recorrente */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {transaction.description}
          </h3>
          {transaction.category && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium truncate">
              {transaction.category.name}
            </span>
          )}
          {transaction.is_recurring && (
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
              <Repeat className="w-3 h-3" />
              <span className="text-xs font-medium">Recorrente</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">
            {formatDate(transaction.date)}
          </span>
          {transaction.is_recurring && transaction.recurring_until && (
            <>
              <span className="text-xs text-gray-400">até</span>
              <span className="text-xs text-gray-500">{formatDate(transaction.recurring_until)}</span>
            </>
          )}
        </div>
      </div>
      {/* Valor */}
      <div className="text-right min-w-[90px]">
        <p className={`font-bold text-lg ${
          transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {formatCurrency(transaction.type === 'income' ? transaction.amount : -transaction.amount)}
        </p>
      </div>
      {/* Ações */}
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
  );
}