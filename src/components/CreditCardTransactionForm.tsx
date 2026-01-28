import React, { useState } from 'react';
import { X } from 'lucide-react';
import { creditCardService, CreditCardTransaction } from '../services/creditCardService';
import { useAuth } from '../hooks/useAuth';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CreditCardTransactionFormProps {
  cardId: string;
  categories: Category[];
  editing?: CreditCardTransaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreditCardTransactionForm({
  cardId,
  categories,
  editing,
  onSuccess,
  onCancel
}: CreditCardTransactionFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    amount: editing?.amount.toString() || '',
    description: editing?.description || '',
    date: editing?.date || new Date().toISOString().split('T')[0],
    installments: editing?.installments.toString() || '1',
    category_id: editing?.category_id || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount === 0) {
        throw new Error('Valor deve ser um número válido diferente de zero');
      }

      if (editing) {
        await creditCardService.updateTransaction(editing.id, user.id, {
          amount,
          description: form.description,
          date: form.date,
          installments: parseInt(form.installments),
          category_id: form.category_id || null
        } as Partial<CreditCardTransaction>);
      } else {
        await creditCardService.createTransaction(user.id, cardId, {
          amount,
          description: form.description,
          date: form.date,
          installments: parseInt(form.installments),
          category_id: form.category_id || undefined
        });
      }

      onSuccess();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editing ? 'Editar Transação' : 'Nova Transação'}
            </h2>
            <button
              onClick={onCancel}
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
                Valor
              </label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0,00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Positivo para compra, negativo para pagamento
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Compra na loja"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parcelas
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                disabled={loading}
              >
                {loading ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
