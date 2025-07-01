import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  accounts: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
  expensesByCategory: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    date: string;
    category: string;
  }>;
}

const COLORS = [
  "#059669",
  "#DC2626",
  "#2563EB",
  "#7C3AED",
  "#EA580C",
  "#DB2777",
];

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    accounts: [],
    expensesByCategory: [],
    monthlyTrend: [],
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const recalculateAccountBalances = async () => {
    try {
      // Buscar todas as contas
      const { data: accounts } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user!.id);

      if (!accounts) return;

      // Para cada conta, calcular o saldo baseado nas transações
      for (const account of accounts) {
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user!.id)
          .eq("account_id", account.id);

        const initialBalance =
          typeof account.initial_balance === "number"
            ? account.initial_balance
            : 0;
        const transactionBalance = (transactions || []).reduce(
          (sum, transaction) => {
            const amount =
              typeof transaction.amount === "number" ? transaction.amount : 0;
            return sum + (transaction.type === "income" ? amount : -amount);
          },
          0,
        );

        const calculatedBalance = initialBalance + transactionBalance;

        // Atualizar apenas se o saldo calculado for diferente do atual
        if (
          Math.abs(calculatedBalance - (account.current_balance || 0)) > 0.01
        ) {
          await supabase
            .from("accounts")
            .update({
              current_balance: calculatedBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);
        }
      }
    } catch (error) {
      console.error("Error recalculating account balances:", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Primeiro, recalcular os saldos das contas
      await recalculateAccountBalances();

      // Get accounts
      const { data: accounts } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user!.id);

      // Get current month transactions
      const currentMonth = new Date();
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      const { data: transactions } = await supabase
        .from("transactions")
        .select(
          `
          *,
          categories (name, color),
          accounts (name)
        `,
        )
        .eq("user_id", user!.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      // Get last 6 months data
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(currentMonth, i);
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const { data: monthTransactions } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user!.id)
          .gte("date", monthStart.toISOString())
          .lte("date", monthEnd.toISOString());

        const income =
          monthTransactions
            ?.filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0) || 0;
        const expense =
          monthTransactions
            ?.filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0) || 0;

        monthlyData.push({
          month: format(month, "MMM", { locale: ptBR }),
          income,
          expense,
          balance: income - expense,
        });
      }

      // Calculate totals
      const totalBalance =
        accounts?.reduce((sum, account) => sum + account.current_balance, 0) ||
        0;
      const monthlyIncome =
        transactions
          ?.filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0) || 0;
      const monthlyExpenses =
        transactions
          ?.filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0) || 0;

      // Group expenses by category
      const expensesByCategory =
        transactions
          ?.filter((t) => t.type === "expense")
          .reduce((acc: any[], transaction: any) => {
            const categoryName =
              transaction.categories?.name || "Sem categoria";
            const existing = acc.find((item) => item.name === categoryName);

            if (existing) {
              existing.value += transaction.amount;
            } else {
              acc.push({
                name: categoryName,
                value: transaction.amount,
                color:
                  transaction.categories?.color ||
                  COLORS[acc.length % COLORS.length],
              });
            }

            return acc;
          }, []) || [];

      // Get recent transactions
      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select(
          `
          *,
          categories (name)
        `,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setData({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        accounts: (accounts || []).map((account) => ({
          name: account.name,
          balance:
            typeof account.current_balance === "number"
              ? account.current_balance
              : 0,
          type: account.type,
        })),
        expensesByCategory,
        monthlyTrend: monthlyData,
        recentTransactions: (recentTransactions || []).map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.date,
          category: t.categories?.name || "Sem categoria",
        })),
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    // Garantir que o valor seja um número válido
    const numericValue = typeof value === "number" && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral das suas finanças</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.totalBalance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Receitas do Mês
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.monthlyIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Despesas do Mês
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.monthlyExpenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo do Mês</p>
              <p
                className={`text-2xl font-bold ${
                  data.monthlyIncome - data.monthlyExpenses >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Expenses by Category */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Despesas por Categoria
          </h3>
          {data.expensesByCategory.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Nenhuma despesa encontrada
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tendência Mensal
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#059669"
                  strokeWidth={2}
                  name="Receitas"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#DC2626"
                  strokeWidth={2}
                  name="Despesas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Transações Recentes
          </h3>
          <div className="space-y-3">
            {data.recentTransactions.length > 0 ? (
              data.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === "income"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(transaction.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                Nenhuma transação encontrada
              </div>
            )}
          </div>
        </div>

        {/* Accounts Overview */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Suas Contas
          </h3>
          <div className="space-y-3">
            {data.accounts.length > 0 ? (
              data.accounts.map((account, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {account.name}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {account.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                Nenhuma conta encontrada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
