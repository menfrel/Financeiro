import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';

interface CreditCardChartProps {
  creditCardId: string;
  userId: string;
  closingDay: number;
}

interface ChartDataPoint {
  month: string;
  purchases: number;
  payments: number;
  balance: number;
  previousDebt: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function CreditCardChart({ creditCardId, userId, closingDay }: CreditCardChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [creditCardId]);

  const fetchChartData = async () => {
    try {
      setLoading(true);

      // Get invoices for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: invoices, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', creditCardId)
        .eq('user_id', userId)
        .gte('cycle_end', sixMonthsAgo.toISOString().split('T')[0])
        .order('cycle_end', { ascending: true });

      if (error) throw error;

      const data: ChartDataPoint[] = (invoices || []).map((invoice) => {
        const cycleEndDate = new Date(invoice.cycle_end);
        const monthName = cycleEndDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        return {
          month: monthName,
          purchases: Number(invoice.purchases_total),
          payments: Number(invoice.payments_total),
          balance: Number(invoice.total_due) - Number(invoice.paid_amount || 0),
          previousDebt: Number(invoice.previous_balance),
        };
      });

      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">Evolução do Saldo</h3>
        <div className="text-center py-8 text-gray-500">
          Nenhum dado disponível. Feche faturas para visualizar o histórico.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold mb-6">Evolução do Saldo</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="purchases"
            stroke="#A855F7"
            strokeWidth={2}
            name="Compras"
            dot={{ fill: '#A855F7', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="payments"
            stroke="#10B981"
            strokeWidth={2}
            name="Pagamentos"
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#EF4444"
            strokeWidth={2}
            name="Saldo Devedor"
            dot={{ fill: '#EF4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Total Compras</div>
          <div className="text-lg font-semibold text-purple-600">
            {formatCurrency(chartData.reduce((sum, d) => sum + d.purchases, 0))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Total Pagamentos</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(chartData.reduce((sum, d) => sum + d.payments, 0))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Saldo Final</div>
          <div className="text-lg font-semibold text-red-600">
            {formatCurrency(chartData[chartData.length - 1]?.balance || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
