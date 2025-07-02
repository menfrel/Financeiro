import React, { useState } from 'react';
import { 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  Smartphone, 
  Edit2, 
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'digital_wallet';
  initial_balance: number;
  current_balance: number;
  created_at: string;
}

interface AccountCardProps {
  account: Account;
  isDetailed: boolean;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

const accountTypes = [
  { value: 'checking', label: 'Conta Corrente', icon: CreditCard },
  { value: 'savings', label: 'Poupança', icon: PiggyBank },
  { value: 'investment', label: 'Investimento', icon: Wallet },
  { value: 'digital_wallet', label: 'Carteira Digital', icon: Smartphone },
];

export function AccountCard({ account, isDetailed, onEdit, onDelete }: AccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type);
    return accountType?.icon || Wallet;
  };

  const getAccountLabel = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type);
    return accountType?.label || 'Conta';
  };

  const balanceChange = account.current_balance - account.initial_balance;
  const balanceChangePercent = account.initial_balance !== 0 
    ? ((balanceChange / Math.abs(account.initial_balance)) * 100) 
    : 0;

  if (!isDetailed) {
    // Layout Resumido - Card Minimalista
    return (
      <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              {React.createElement(getAccountIcon(account.type), { 
                className: "w-6 h-6 text-blue-600" 
              })}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{account.name}</h3>
              <p className="text-xs text-gray-500">{getAccountLabel(account.type)}</p>
            </div>
          </div>
          
          {/* Actions - Hidden by default, shown on hover */}
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => onEdit(account)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo Atual</span>
            <span className="font-bold text-lg text-gray-900">
              {formatCurrency(account.current_balance)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Saldo Inicial</span>
            <span className="text-sm text-gray-600">
              {formatCurrency(account.initial_balance)}
            </span>
          </div>

          {/* Balance Change Indicator */}
          {balanceChange !== 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-1">
                {balanceChange > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                )}
                <span className={`text-xs font-medium ${
                  balanceChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {balanceChange > 0 ? '+' : ''}{formatCurrency(balanceChange)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Layout Detalhado - Card Expandido
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start space-x-4">
            {/* Enhanced Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-sm">
              {React.createElement(getAccountIcon(account.type), { 
                className: "w-8 h-8 text-white" 
              })}
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{account.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{getAccountLabel(account.type)}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>Criada em {new Date(account.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(account)}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors font-medium"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>
          </div>
        </div>

        {/* Balance Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl border border-emerald-200">
            <div className="flex items-center space-x-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">Saldo Atual</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(account.current_balance)}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">Saldo Inicial</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(account.initial_balance)}
            </p>
          </div>
        </div>

        {/* Balance Change Analysis */}
        {balanceChange !== 0 && (
          <div className="mb-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium transition-colors mb-4"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Análise de Variação</span>
            </button>

            {isExpanded && (
              <div className={`p-4 rounded-xl border ${
                balanceChange > 0 
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' 
                  : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      balanceChange > 0 ? 'text-emerald-900' : 'text-rose-900'
                    }`}>
                      Variação Total
                    </p>
                    <div className="flex items-center space-x-2">
                      {balanceChange > 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                      )}
                      <p className={`font-bold ${
                        balanceChange > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {balanceChange > 0 ? '+' : ''}{formatCurrency(balanceChange)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      balanceChange > 0 ? 'text-emerald-900' : 'text-rose-900'
                    }`}>
                      Percentual
                    </p>
                    <p className={`font-bold ${
                      balanceChange > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {balanceChange > 0 ? '+' : ''}{balanceChangePercent.toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      balanceChange > 0 ? 'text-emerald-900' : 'text-rose-900'
                    }`}>
                      Status
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      balanceChange > 0 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {balanceChange > 0 ? 'Crescimento' : 'Redução'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}