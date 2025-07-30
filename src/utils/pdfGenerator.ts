import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  topExpenseCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  account: string;
}

export const generatePDFReport = async (data: ReportData, userEmail: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  let currentY = 0;

  // ==================== HEADER ====================
  // Background
  pdf.setFillColor(249, 250, 252);
  pdf.rect(0, 0, pageWidth, 80, 'F');

  // Title
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relatórios', margin, 35);

  // Subtitle
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Análise detalhada das suas finanças', margin, 50);

  // Period and generation info
  pdf.setFontSize(12);
  const periodText = `Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`;
  const generatedText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
  
  pdf.text(periodText, margin, 65);
  pdf.text(generatedText, pageWidth - margin - pdf.getTextWidth(generatedText), 65);

  currentY = 100;

  // ==================== SUMMARY CARDS ====================
  const cardWidth = (contentWidth - 16) / 3;
  const cardHeight = 100;

  // Total Income Card
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Icon background
  pdf.setFillColor(34, 197, 94);
  pdf.roundedRect(margin + 20, currentY + 20, 48, 48, 12, 12, 'F');
  
  // Icon
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('↑', margin + 40, currentY + 50);
  
  // Label
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total de Receitas', margin + 20, currentY + 85);
  
  // Value
  pdf.setTextColor(34, 197, 94);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 20, currentY + 105);

  // Total Expenses Card
  const expenseX = margin + cardWidth + 8;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(expenseX, currentY, cardWidth, cardHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(expenseX, currentY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Icon background
  pdf.setFillColor(239, 68, 68);
  pdf.roundedRect(expenseX + 20, currentY + 20, 48, 48, 12, 12, 'F');
  
  // Icon
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('↓', expenseX + 40, currentY + 50);
  
  // Label
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total de Despesas', expenseX + 20, currentY + 85);
  
  // Value
  pdf.setTextColor(239, 68, 68);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), expenseX + 20, currentY + 105);

  // Balance Card
  const balanceX = margin + (cardWidth + 8) * 2;
  const balanceColor = data.balance >= 0 ? [34, 197, 94] : [239, 68, 68];
  
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(balanceX, currentY, cardWidth, cardHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(balanceX, currentY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Icon background
  pdf.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  pdf.roundedRect(balanceX + 20, currentY + 20, 48, 48, 12, 12, 'F');
  
  // Icon
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('=', balanceX + 40, currentY + 50);
  
  // Label
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Saldo do Período', balanceX + 20, currentY + 85);
  
  // Value
  pdf.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), balanceX + 20, currentY + 105);

  currentY += 140;

  // ==================== CHARTS SECTION ====================
  const chartSectionHeight = 200;
  
  // Monthly Trend Chart
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, currentY, (contentWidth - 8) / 2, chartSectionHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, (contentWidth - 8) / 2, chartSectionHeight, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Tendência Mensal', margin + 20, currentY + 30);

  // Simple chart representation
  const chartX = margin + 20;
  const chartY = currentY + 50;
  const chartWidth = (contentWidth - 8) / 2 - 40;
  const chartHeight = 120;

  // Chart background
  pdf.setFillColor(248, 250, 252);
  pdf.rect(chartX, chartY, chartWidth, chartHeight, 'F');

  // Chart bars (simplified representation)
  if (data.monthlyTrend.length > 0) {
    const maxValue = Math.max(...data.monthlyTrend.map(d => Math.max(d.income, d.expense)));
    const barWidth = (chartWidth / data.monthlyTrend.length) / 3;

    data.monthlyTrend.forEach((month, index) => {
      const x = chartX + (chartWidth / data.monthlyTrend.length) * index + 10;
      const incomeHeight = maxValue > 0 ? (month.income / maxValue) * chartHeight * 0.8 : 0;
      const expenseHeight = maxValue > 0 ? (month.expense / maxValue) * chartHeight * 0.8 : 0;

      // Income bar
      pdf.setFillColor(34, 197, 94);
      pdf.rect(x, chartY + chartHeight - incomeHeight, barWidth, incomeHeight, 'F');

      // Expense bar
      pdf.setFillColor(239, 68, 68);
      pdf.rect(x + barWidth + 2, chartY + chartHeight - expenseHeight, barWidth, expenseHeight, 'F');

      // Month label
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(month.month, x, chartY + chartHeight + 12);
    });
  }

  // Expenses by Category Chart
  const categoryChartX = margin + (contentWidth - 8) / 2 + 8;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(categoryChartX, currentY, (contentWidth - 8) / 2, chartSectionHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(categoryChartX, currentY, (contentWidth - 8) / 2, chartSectionHeight, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Despesas por Categoria', categoryChartX + 20, currentY + 30);

  // Category list
  let categoryY = currentY + 60;
  data.topExpenseCategories.slice(0, 5).forEach((category, index) => {
    // Color indicator
    const categoryColorRGB = [
      parseInt(category.color.slice(1, 3), 16),
      parseInt(category.color.slice(3, 5), 16),
      parseInt(category.color.slice(5, 7), 16)
    ];
    pdf.setFillColor(categoryColorRGB[0], categoryColorRGB[1], categoryColorRGB[2]);
    pdf.circle(categoryChartX + 25, categoryY, 4, 'F');
    
    // Category name
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(category.name, categoryChartX + 35, categoryY + 2);
    
    // Percentage
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(10);
    pdf.text(`${category.percentage.toFixed(1)}%`, categoryChartX + 35, categoryY + 12);
    
    // Amount
    pdf.setTextColor(239, 68, 68);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const amountText = formatCurrency(category.amount);
    const amountWidth = pdf.getTextWidth(amountText);
    pdf.text(amountText, categoryChartX + (contentWidth - 8) / 2 - amountWidth - 20, categoryY + 2);
    
    categoryY += 25;
  });

  currentY += chartSectionHeight + 40;

  // ==================== CATEGORY COMPARISON TABLE ====================
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, currentY, contentWidth, 200, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 200, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Receitas vs Despesas por Categoria', margin + 20, currentY + 30);

  // Table header
  const tableY = currentY + 50;
  pdf.setFillColor(249, 250, 252);
  pdf.rect(margin + 20, tableY, contentWidth - 40, 15, 'F');
  
  pdf.setTextColor(55, 65, 81);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Categoria', margin + 30, tableY + 10);
  pdf.text('Receitas', margin + 150, tableY + 10);
  pdf.text('Despesas', margin + 250, tableY + 10);
  pdf.text('Saldo', margin + 350, tableY + 10);

  // Table rows
  let tableRowY = tableY + 20;
  data.transactionsByCategory.slice(0, 6).forEach((category, index) => {
    const balance = category.income - category.expense;
    const rowColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    
    pdf.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
    pdf.rect(margin + 20, tableRowY, contentWidth - 40, 15, 'F');
    
    // Category color indicator
    const categoryColorRGB = [
      parseInt(category.color.slice(1, 3), 16),
      parseInt(category.color.slice(3, 5), 16),
      parseInt(category.color.slice(5, 7), 16)
    ];
    pdf.setFillColor(categoryColorRGB[0], categoryColorRGB[1], categoryColorRGB[2]);
    pdf.circle(margin + 25, tableRowY + 7, 3, 'F');
    
    // Category data
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(category.name, margin + 35, tableRowY + 10);
    
    pdf.setTextColor(34, 197, 94);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.income), margin + 150, tableRowY + 10);
    
    pdf.setTextColor(239, 68, 68);
    pdf.text(formatCurrency(category.expense), margin + 250, tableRowY + 10);
    
    pdf.setTextColor(balance >= 0 ? 34 : 239, balance >= 0 ? 197 : 68, balance >= 0 ? 94 : 68);
    pdf.text(formatCurrency(balance), margin + 350, tableRowY + 10);
    
    tableRowY += 15;
  });

  currentY += 240;

  // ==================== TOP EXPENSE CATEGORIES ====================
  if (data.topExpenseCategories.length > 0) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, currentY, contentWidth, 150, 8, 8, 'F');
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, currentY, contentWidth, 150, 8, 8, 'S');
    
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Principais Categorias de Despesa', margin + 20, currentY + 30);

    let rankingY = currentY + 60;
    data.topExpenseCategories.slice(0, 4).forEach((category, index) => {
      // Ranking background
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin + 20, rankingY, contentWidth - 40, 20, 8, 8, 'F');
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin + 20, rankingY, contentWidth - 40, 20, 8, 8, 'S');
      
      // Ranking number
      pdf.setFillColor(59, 130, 246);
      pdf.circle(margin + 35, rankingY + 10, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 31, rankingY + 14);
      
      // Category name
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 55, rankingY + 12);
      
      // Percentage
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 55, rankingY + 22);
      
      // Amount
      pdf.setTextColor(239, 68, 68);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 30, rankingY + 14);
      
      rankingY += 30;
    });

    currentY += 170;
  }

  // ==================== FOOTER ====================
  const footerY = pageHeight - 30;
  pdf.setFillColor(249, 250, 252);
  pdf.rect(0, footerY, pageWidth, 30, 'F');
  
  // Footer content
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gestão Psi Profissional', margin, footerY + 15);
  pdf.text('contato@gestao.com.br', margin, footerY + 25);
  
  // Page number
  pdf.text('Página 1', pageWidth - margin - 20, footerY + 20);

  const fileName = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};

export const generateDetailedPDFReport = async (
  data: ReportData,
  userEmail: string,
  transactions: Transaction[]
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 60) {
      pdf.addPage();
      addHeader();
      return 100;
    }
    return currentY;
  };

  const addHeader = () => {
    // Header background
    pdf.setFillColor(249, 250, 252);
    pdf.rect(0, 0, pageWidth, 80, 'F');
    
    // Title
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório Detalhado', margin, 35);
    
    // Subtitle
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Análise completa das transações', margin, 50);
    
    // Period info
    pdf.setFontSize(10);
    const periodText = `Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`;
    pdf.text(periodText, margin, 65);
    pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth - margin - 80, 65);
  };

  let currentY = 0;
  addHeader();
  currentY = 100;

  // ==================== EXECUTIVE SUMMARY ====================
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, currentY, contentWidth, 120, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 120, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Executivo', margin + 20, currentY + 30);

  // Summary metrics in grid
  const metricsY = currentY + 50;
  const metricWidth = (contentWidth - 60) / 3;

  // Income metric
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin + 20, metricsY, metricWidth, 50, 6, 6, 'F');
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Receitas:', margin + 30, metricsY + 15);
  pdf.setTextColor(34, 197, 94);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 30, metricsY + 35);

  // Expense metric
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin + 40 + metricWidth, metricsY, metricWidth, 50, 6, 6, 'F');
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Despesas:', margin + 50 + metricWidth, metricsY + 15);
  pdf.setTextColor(239, 68, 68);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), margin + 50 + metricWidth, metricsY + 35);

  // Balance metric
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin + 60 + metricWidth * 2, metricsY, metricWidth, 50, 6, 6, 'F');
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saldo:', margin + 70 + metricWidth * 2, metricsY + 15);
  const balanceColor = data.balance >= 0 ? [34, 197, 94] : [239, 68, 68];
  pdf.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), margin + 70 + metricWidth * 2, metricsY + 35);

  currentY += 140;

  // ==================== DETAILED TRANSACTIONS ====================
  currentY = checkPageBreak(currentY, 60);
  
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, currentY, contentWidth, 40, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 40, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento de Transações', margin + 20, currentY + 25);

  currentY += 60;

  // Group transactions by date
  const transactionsByDate = transactions.reduce((acc, transaction) => {
    const date = transaction.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(transactionsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  sortedDates.forEach(date => {
    const dayTransactions = transactionsByDate[date];
    
    currentY = checkPageBreak(currentY, 100);
    
    // Date header
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin, currentY, contentWidth, 25, 8, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 20, currentY + 17);
    
    // Day summary
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    pdf.setFontSize(10);
    const summary = `${dayTransactions.length} transações • Saldo: ${formatCurrency(dayBalance)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 20, currentY + 17);
    
    currentY += 35;
    
    // Day transactions
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 30);
      
      // Transaction card
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      pdf.roundedRect(margin, currentY, contentWidth, 25, 6, 6, 'F');
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, currentY, contentWidth, 25, 6, 6, 'S');
      
      // Type indicator
      const typeColor = transaction.type === 'income' ? [34, 197, 94] : [239, 68, 68];
      pdf.setFillColor(typeColor[0], typeColor[1], typeColor[2]);
      pdf.roundedRect(margin + 8, currentY + 8, 6, 9, 3, 3, 'F');
      
      // Description
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.description, margin + 25, currentY + 12);
      
      // Category and account
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${transaction.category} • ${transaction.account}`, margin + 25, currentY + 20);
      
      // Amount
      pdf.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 20, currentY + 15);
      
      currentY += 30;
    });
    
    currentY += 15;
  });

  // ==================== FOOTER ON ALL PAGES ====================
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 30;
    
    pdf.setFillColor(249, 250, 252);
    pdf.rect(0, footerY, pageWidth, 30, 'F');
    
    // Footer content
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema de Gestão Psi Profissional - Relatório Detalhado', margin, footerY + 15);
    pdf.text('contato@gestao.com.br', margin, footerY + 25);
    
    // Page number
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 40, footerY + 20);
  }

  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};