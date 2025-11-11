import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Calendar } from 'lucide-react';

interface InvoiceHistoryTableProps {
  creditCardId: string;
  userId: string;
}

interface Invoice {
  id: string;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  purchases_total: number;
  payments_total: number;
  previous_balance: number;
  total_due: number;
  paid_amount: number;
  status: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export default function InvoiceHistoryTable({ creditCardId, userId }: InvoiceHistoryTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [creditCardId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', creditCardId)
        .eq('user_id', userId)
        .order('cycle_end', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma fatura fechada</h3>
          <p className="text-gray-500">
            Feche faturas na aba de transações para visualizar o histórico aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Histórico de Faturas
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Período
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compras
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagamentos
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo Anterior
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Fatura
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo Devedor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => {
              const outstandingBalance = Number(invoice.total_due) - Number(invoice.paid_amount || 0);
              const isPaid = outstandingBalance <= 0;

              return (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(invoice.cycle_start)} - {formatDate(invoice.cycle_end)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-medium">
                    {formatCurrency(Number(invoice.purchases_total))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                    {formatCurrency(Number(invoice.payments_total))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                    {formatCurrency(Number(invoice.previous_balance))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                    {formatCurrency(Number(invoice.total_due))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                    <span className={isPaid ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(Math.max(0, outstandingBalance))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isPaid
                          ? 'bg-green-100 text-green-800'
                          : outstandingBalance > 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Total Compras</div>
            <div className="text-lg font-semibold text-purple-600">
              {formatCurrency(invoices.reduce((sum, inv) => sum + Number(inv.purchases_total), 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Total Pagamentos</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(invoices.reduce((sum, inv) => sum + Number(inv.payments_total), 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Faturas Fechadas</div>
            <div className="text-lg font-semibold text-blue-600">
              {invoices.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Saldo Total Devedor</div>
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(
                invoices.reduce((sum, inv) => {
                  const balance = Number(inv.total_due) - Number(inv.paid_amount || 0);
                  return sum + Math.max(0, balance);
                }, 0)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
