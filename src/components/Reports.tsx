import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionsByCategory: Array<{
    name: string;
    income: number;
    expense: number;
    color: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  expensesByCategory: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topExpenseCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
}

export function Reports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactionsByCategory: [],
    monthlyTrend: [],
    expensesByCategory: [],
    topExpenseCategories: [],
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    accountId: "",
    categoryId: "",
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, filters]);

  const loadInitialData = async () => {
    try {
      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (accountsError) {
        console.error("Error loading accounts:", accountsError);
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (categoriesError) {
        console.error("Error loading categories:", categoriesError);
      }

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      console.log("=== RELATÓRIOS DEBUG DETALHADO ===");
      console.log("User ID:", user.id);
      console.log("Filtros aplicados:", filters);
      console.log("Data inicial:", filters.startDate);
      console.log("Data final:", filters.endDate);

      // Primeiro, vamos buscar TODAS as transações do usuário para debug
      const { data: allTransactions, error: allError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (allError) {
        console.error("Erro ao buscar todas as transações:", allError);
      } else {
        console.log("Total de transações do usuário:", allTransactions?.length || 0);
        
        // Debug das receitas
        const allIncomes = allTransactions?.filter(t => t.type === "income") || [];
        console.log("Total de receitas no banco:", allIncomes.length);
        
        if (allIncomes.length > 0) {
          console.log("Receitas encontradas no banco:");
          allIncomes.forEach(income => {
            console.log(`- ID: ${income.id}, Valor: ${income.amount}, Data: ${income.date}, Tipo: ${income.type}`);
          });
        }

        // Debug das transações no período
        const transactionsInPeriod = allTransactions?.filter(t => 
          t.date >= filters.startDate && t.date <= filters.endDate
        ) || [];
        console.log("Transações no período filtrado:", transactionsInPeriod.length);
        
        const incomesInPeriod = transactionsInPeriod.filter(t => t.type === "income");
        console.log("Receitas no período:", incomesInPeriod.length);
        
        if (incomesInPeriod.length > 0) {
          console.log("Receitas no período:");
          incomesInPeriod.forEach(income => {
            console.log(`- Valor: ${income.amount}, Data: ${income.date}`);
          });
        }
      }

      // Agora vamos fazer a consulta com joins para os relatórios
      let transactionsQuery = supabase
        .from("transactions")
        .select(`
          id,
          amount,
          type,
          description,
          date,
          user_id,
          account_id,
          category_id,
          categories (
            id,
            name,
            color,
            type
          ),
          accounts (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .gte("date", filters.startDate)
        .lte("date", filters.endDate)
        .order("date", { ascending: false });

      // Aplicar filtros adicionais
      if (filters.accountId) {
        transactionsQuery = transactionsQuery.eq("account_id", filters.accountId);
      }

      if (filters.categoryId) {
        transactionsQuery = transactionsQuery.eq("category_id", filters.categoryId);
      }

      const { data: transactions, error: transactionsError } = await transactionsQuery;

      if (transactionsError) {
        console.error("Erro ao carregar transações com joins:", transactionsError);
        setLoading(false);
        return;
      }

      console.log("Transações carregadas com joins:", transactions?.length || 0);

      if (!transactions || transactions.length === 0) {
        console.log("Nenhuma transação encontrada no período com joins");
        setReportData({
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          transactionsByCategory: [],
          monthlyTrend: [],
          expensesByCategory: [],
          topExpenseCategories: [],
        });
        setLoading(false);
        return;
      }

      // Validar e processar transações
      const validTransactions = transactions.map(t => {
        const amount = parseFloat(String(t.amount)) || 0;
        return {
          ...t,
          amount: amount
        };
      });

      console.log("Transações validadas:", validTransactions.length);

      // Separar por tipo
      const incomeTransactions = validTransactions.filter(t => t.type === "income");
      const expenseTransactions = validTransactions.filter(t => t.type === "expense");

      console.log("Receitas após join:", incomeTransactions.length);
      console.log("Despesas após join:", expenseTransactions.length);

      // Debug detalhado das receitas
      if (incomeTransactions.length > 0) {
        console.log("Detalhes das receitas após join:");
        incomeTransactions.forEach(t => {
          console.log(`- ${t.description}: R$ ${t.amount} (${t.date}) - Categoria: ${t.categories?.name || 'N/A'}`);
        });
      } else {
        console.log("PROBLEMA: Nenhuma receita encontrada após o join!");
        
        // Vamos verificar se o problema está no join
        const { data: simpleIncomes } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "income")
          .gte("date", filters.startDate)
          .lte("date", filters.endDate);
          
        console.log("Receitas sem join:", simpleIncomes?.length || 0);
        
        if (simpleIncomes && simpleIncomes.length > 0) {
          console.log("Receitas encontradas sem join - problema está no join!");
          simpleIncomes.forEach(income => {
            console.log(`- Receita sem join: ${income.description}, Valor: ${income.amount}, Category ID: ${income.category_id}`);
          });
          
          // Verificar se as categorias existem
          for (const income of simpleIncomes) {
            const { data: category } = await supabase
              .from("categories")
              .select("*")
              .eq("id", income.category_id)
              .single();
              
            console.log(`Categoria para receita ${income.id}:`, category);
          }
        }
      }

      // Calcular totais
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpenses;

      console.log("=== TOTAIS CALCULADOS ===");
      console.log("Total de receitas:", totalIncome);
      console.log("Total de despesas:", totalExpenses);
      console.log("Saldo:", balance);

      // Agrupar por categoria
      const categoryGroups = validTransactions.reduce((acc: any, transaction: any) => {
        const categoryName = transaction.categories?.name || "Sem categoria";
        const categoryColor = transaction.categories?.color || "#6B7280";

        if (!acc[categoryName]) {
          acc[categoryName] = {
            name: categoryName,
            income: 0,
            expense: 0,
            color: categoryColor,
          };
        }

        if (transaction.type === "income") {
          acc[categoryName].income += transaction.amount;
        } else {
          acc[categoryName].expense += transaction.amount;
        }

        return acc;
      }, {});

      const transactionsByCategory = Object.values(categoryGroups);

      // Tendência mensal (últimos 6 meses)
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

        // Filtrar transações do mês
        const monthTransactions = validTransactions.filter((t) => {
          return t.date >= monthStart && t.date <= monthEnd;
        });

        const monthIncome = monthTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const monthExpense = monthTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        monthlyTrend.push({
          month: format(month, "MMM", { locale: ptBR }),
          income: monthIncome,
          expense: monthExpense,
          balance: monthIncome - monthExpense,
        });
      }

      // Despesas por categoria para gráfico de pizza
      const expensesByCategory = expenseTransactions
        .reduce((acc: any[], transaction: any) => {
          const categoryName = transaction.categories?.name || "Sem categoria";
          const categoryColor = transaction.categories?.color || "#6B7280";
          const existing = acc.find((item) => item.name === categoryName);

          if (existing) {
            existing.value += transaction.amount;
          } else {
            acc.push({
              name: categoryName,
              value: transaction.amount,
              color: categoryColor,
            });
          }

          return acc;
        }, [])
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Top categorias de despesa
      const topExpenseCategories = expensesByCategory
        .slice(0, 5)
        .map((cat) => ({
          name: cat.name,
          amount: cat.value,
          percentage: totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0,
          color: cat.color,
        }));

      console.log("=== DADOS FINAIS ===");
      console.log("Dados do relatório:", {
        totalIncome,
        totalExpenses,
        balance,
        categoriesCount: transactionsByCategory.length,
        monthlyTrendCount: monthlyTrend.length,
      });

      setReportData({
        totalIncome,
        totalExpenses,
        balance,
        transactionsByCategory,
        monthlyTrend,
        expensesByCategory,
        topExpenseCategories,
      });
    } catch (error) {
      console.error("Erro ao carregar dados do relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ["Categoria", "Receitas", "Despesas", "Saldo"],
      ...reportData.transactionsByCategory.map((cat) => [
        cat.name,
        cat.income.toFixed(2),
        cat.expense.toFixed(2),
        (cat.income - cat.expense).toFixed(2),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-2">
            Análise detalhada das suas finanças
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conta
            </label>
            <select
              value={filters.accountId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, accountId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as contas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={filters.categoryId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, categoryId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as categorias</option>
              <optgroup label="Receitas">
                {categories
                  .filter((cat) => cat.type === "income")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Despesas">
                {categories
                  .filter((cat) => cat.type === "expense")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total de Receitas
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(reportData.totalIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total de Despesas
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(reportData.totalExpenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Saldo do Período
              </p>
              <p
                className={`text-2xl font-bold ${
                  reportData.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(reportData.balance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Tendência Mensal */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tendência Mensal
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.monthlyTrend}>
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
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#2563EB"
                  strokeWidth={2}
                  name="Saldo"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Despesas por Categoria
          </h3>
          {reportData.expensesByCategory.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={reportData.expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportData.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Nenhuma despesa encontrada
            </div>
          )}
        </div>
      </div>

      {/* Comparação por Categoria */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Receitas vs Despesas por Categoria
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData.transactionsByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="income" fill="#059669" name="Receitas" />
              <Bar dataKey="expense" fill="#DC2626" name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categorias de Despesa */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Principais Categorias de Despesa
        </h3>
        <div className="space-y-4">
          {reportData.topExpenseCategories.map((category, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-sm font-medium text-gray-600">
                  {index + 1}
                </div>
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium text-gray-900">
                  {category.name}
                </span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(category.amount)}
                </p>
                <p className="text-sm text-gray-600">
                  {category.percentage.toFixed(1)}% do total
                </p>
              </div>
            </div>
          ))}

          {reportData.topExpenseCategories.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Nenhuma despesa encontrada no período selecionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}