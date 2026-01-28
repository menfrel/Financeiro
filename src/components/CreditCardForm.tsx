import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { creditCardService } from '../services/creditCardService';
import { useAuth } from '../hooks/useAuth';

interface CreditCardFormProps {
  onSuccess: () => void;
}

export default function CreditCardForm({ onSuccess }: CreditCardFormProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    limit_amount: '',
    closing_day: '',
    due_day: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      await creditCardService.createCreditCard(user.id, {
        name: form.name,
        limit_amount: parseFloat(form.limit_amount),
        closing_day: parseInt(form.closing_day),
        due_day: parseInt(form.due_day)
      });

      setForm({ name: '', limit_amount: '', closing_day: '', due_day: '' });
      setShowForm(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cartão');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Novo Cartão
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Novo Cartão de Crédito</h3>
        <button
          onClick={() => setShowForm(false)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Cartão
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Nubank"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limite (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.limit_amount}
            onChange={(e) => setForm({ ...form, limit_amount: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0,00"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia de Fechamento
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={form.closing_day}
              onChange={(e) => setForm({ ...form, closing_day: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia de Vencimento
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={form.due_day}
              onChange={(e) => setForm({ ...form, due_day: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Criando...' : 'Criar Cartão'}
          </button>
        </div>
      </form>
    </div>
  );
}
