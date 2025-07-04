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

// Modern color palette
const colors = {
  primary: [99, 102, 241],      // indigo-500
  secondary: [139, 92, 246],    // violet-500
  success: [34, 197, 94],       // green-500
  danger: [239, 68, 68],        // red-500
  warning: [245, 158, 11],      // amber-500
  info: [59, 130, 246],         // blue-500
  dark: [17, 24, 39],           // gray-900
  light: [249, 250, 251],       // gray-50
  white: [255, 255, 255],
  gradient1: [99, 102, 241],    // indigo-500
  gradient2: [139, 92, 246],    // violet-500
};

export const generatePDFReport = async (data: ReportData, userEmail: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const addGradientBackground = (x: number, y: number, width: number, height: number, color1: number[], color2: number[]) => {
    // Simulate gradient with multiple rectangles
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
      const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
      const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
      
      pdf.setFillColor(r, g, b);
      pdf.rect(x, y + (height * ratio), width, height / steps, 'F');
    }
  };

  const addModernCard = (x: number, y: number, width: number, height: number, title: string, value: string, subtitle: string, color: number[], icon?: string) => {
    // Card shadow
    pdf.setFillColor(0, 0, 0, 0.1);
    pdf.roundedRect(x + 1, y + 1, width, height, 8, 8, 'F');
    
    // Card background
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(x, y, width, height, 8, 8, 'F');
    
    // Card border
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, width, height, 8, 8, 'S');
    
    // Accent bar
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, width, 4, 8, 8, 'F');
    pdf.rect(x, y + 2, width, 2, 'F');
    
    // Icon background
    if (icon) {
      pdf.setFillColor(color[0], color[1], color[2], 0.1);
      pdf.circle(x + width - 20, y + 20, 12, 'F');
      
      // Icon (simplified representation)
      pdf.setFillColor(...color);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(icon, x + width - 24, y + 24);
    }
    
    // Title
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title, x + 12, y + 20);
    
    // Value
    pdf.setTextColor(...color);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, x + 12, y + 35);
    
    // Subtitle
    pdf.setTextColor(156, 163, 175);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, x + 12, y + 45);
  };

  const addSectionHeader = (x: number, y: number, title: string, subtitle: string) => {
    // Background
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, contentWidth, 25, 6, 6, 'F');
    
    // Title
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, x + 15, y + 12);
    
    // Subtitle
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, x + 15, y + 20);
  };

  let currentY = 0;

  // Modern Header with Gradient
  addGradientBackground(0, 0, pageWidth, 80, colors.gradient1, colors.gradient2);
  
  // Header content
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO FINANCEIRO', margin, 25);
  
  // Decorative line
  pdf.setDrawColor(...colors.white);
  pdf.setLineWidth(2);
  pdf.line(margin, 35, margin + 100, 35);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 45);
  pdf.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 55);
  pdf.text(`${userEmail}`, margin, 65);

  currentY = 100;

  // KPI Cards Section
  addSectionHeader(margin, currentY, 'RESUMO EXECUTIVO', 'Principais indicadores do período');
  currentY += 35;

  // Three modern KPI cards
  const cardWidth = (contentWidth - 20) / 3;
  
  addModernCard(
    margin, currentY, cardWidth, 60,
    'RECEITAS TOTAIS',
    formatCurrency(data.totalIncome),
    'Entradas no período',
    colors.success,
    '↗'
  );
  
  addModernCard(
    margin + cardWidth + 10, currentY, cardWidth, 60,
    'DESPESAS TOTAIS', 
    formatCurrency(data.totalExpenses),
    'Saídas no período',
    colors.danger,
    '↘'
  );
  
  addModernCard(
    margin + (cardWidth + 10) * 2, currentY, cardWidth, 60,
    'SALDO LÍQUIDO',
    formatCurrency(data.balance),
    data.balance >= 0 ? 'Resultado positivo' : 'Resultado negativo',
    data.balance >= 0 ? colors.success : colors.danger,
    data.balance >= 0 ? '✓' : '✗'
  );

  currentY += 80;

  // Categories Section
  addSectionHeader(margin, currentY, 'ANÁLISE POR CATEGORIA', 'Distribuição de receitas e despesas');
  currentY += 35;

  // Modern table with cards
  data.transactionsByCategory.slice(0, 8).forEach((category, index) => {
    const balance = category.income - category.expense;
    const cardY = currentY + (index * 35);
    
    // Category card
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(margin, cardY, contentWidth, 30, 4, 4, 'F');
    
    // Category color indicator
    const hexColor = category.color;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(margin + 5, cardY + 5, 4, 20, 2, 2, 'F');
    
    // Category name
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(category.name, margin + 15, cardY + 12);
    
    // Income
    pdf.setTextColor(...colors.success);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Receitas:', margin + 15, cardY + 20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.income), margin + 45, cardY + 20);
    
    // Expense
    pdf.setTextColor(...colors.danger);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Despesas:', margin + 100, cardY + 20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.expense), margin + 130, cardY + 20);
    
    // Balance
    pdf.setTextColor(...(balance >= 0 ? colors.success : colors.danger));
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    const balanceText = formatCurrency(balance);
    const balanceWidth = pdf.getTextWidth(balanceText);
    pdf.text(balanceText, pageWidth - margin - balanceWidth - 5, cardY + 16);
  });

  currentY += (Math.min(data.transactionsByCategory.length, 8) * 35) + 20;

  // Top Categories Section
  if (data.topExpenseCategories.length > 0) {
    addSectionHeader(margin, currentY, 'TOP CATEGORIAS DE DESPESA', 'Maiores gastos do período');
    currentY += 35;

    data.topExpenseCategories.slice(0, 5).forEach((category, index) => {
      const cardY = currentY + (index * 40);
      
      // Ranking card
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, cardY, contentWidth, 35, 6, 6, 'F');
      
      // Ranking number
      pdf.setFillColor(...colors.primary);
      pdf.circle(margin + 20, cardY + 17.5, 12, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 17, cardY + 21);
      
      // Category info
      pdf.setTextColor(...colors.dark);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 40, cardY + 15);
      
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total de despesas`, margin + 40, cardY + 25);
      
      // Amount
      pdf.setTextColor(...colors.danger);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 10, cardY + 20);
    });
  }

  // Modern Footer
  const footerY = pageHeight - 25;
  addGradientBackground(0, footerY, pageWidth, 25, colors.light, colors.white);
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gerenciamento Financeiro', margin, footerY + 15);
  pdf.text(`Página 1`, pageWidth - margin - 20, footerY + 15);

  // Save with modern filename
  const fileName = `relatorio-financeiro-moderno-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
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
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const addGradientBackground = (x: number, y: number, width: number, height: number, color1: number[], color2: number[]) => {
    const steps = 15;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
      const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
      const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
      
      pdf.setFillColor(r, g, b);
      pdf.rect(x, y + (height * ratio), width, height / steps, 'F');
    }
  };

  const addTransactionCard = (x: number, y: number, transaction: Transaction, isEven: boolean) => {
    const cardHeight = 25;
    const typeColor = transaction.type === 'income' ? colors.success : colors.danger;
    
    // Card background
    pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    pdf.roundedRect(x, y, contentWidth, cardHeight, 4, 4, 'F');
    
    // Type indicator
    pdf.setFillColor(...typeColor);
    pdf.roundedRect(x + 5, y + 5, 3, 15, 1.5, 1.5, 'F');
    
    // Transaction icon
    pdf.setFillColor(typeColor[0], typeColor[1], typeColor[2], 0.1);
    pdf.circle(x + 20, y + 12.5, 8, 'F');
    pdf.setTextColor(...typeColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(transaction.type === 'income' ? '↗' : '↘', x + 17, y + 15);
    
    // Description
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(transaction.description, x + 35, y + 10);
    
    // Category and account
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${transaction.category} • ${transaction.account}`, x + 35, y + 18);
    
    // Amount
    pdf.setTextColor(...typeColor);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
    const amountWidth = pdf.getTextWidth(amountText);
    pdf.text(amountText, pageWidth - margin - amountWidth - 5, y + 15);
  };

  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 40) {
      pdf.addPage();
      return 30;
    }
    return currentY;
  };

  let currentY = 0;

  // Ultra-modern header
  addGradientBackground(0, 0, pageWidth, 90, colors.gradient1, colors.gradient2);
  
  // Decorative elements
  pdf.setFillColor(255, 255, 255, 0.1);
  pdf.circle(pageWidth - 30, 20, 25, 'F');
  pdf.circle(pageWidth - 60, 60, 15, 'F');
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO', margin, 30);
  pdf.text('DETALHADO', margin, 50);
  
  // Decorative line
  pdf.setDrawColor(...colors.white);
  pdf.setLineWidth(3);
  pdf.line(margin, 60, margin + 80, 60);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 72);
  pdf.text(`Gerado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} | ${userEmail}`, margin, 82);

  currentY = 110;

  // Executive Summary Card
  pdf.setFillColor(...colors.white);
  pdf.roundedRect(margin, currentY, contentWidth, 50, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 50, 8, 8, 'S');

  // Summary content
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO EXECUTIVO', margin + 15, currentY + 15);

  const summaryData = [
    { label: 'Receitas:', value: formatCurrency(data.totalIncome), color: colors.success },
    { label: 'Despesas:', value: formatCurrency(data.totalExpenses), color: colors.danger },
    { label: 'Saldo:', value: formatCurrency(data.balance), color: data.balance >= 0 ? colors.success : colors.danger },
    { label: 'Transações:', value: transactions.length.toString(), color: colors.info }
  ];

  summaryData.forEach((item, index) => {
    const x = margin + 15 + (index * (contentWidth / 4));
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.label, x, currentY + 28);
    
    pdf.setTextColor(...item.color);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.value, x, currentY + 38);
  });

  currentY += 70;

  // Transactions by date
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
    
    currentY = checkPageBreak(currentY, 80);
    
    // Date header card
    addGradientBackground(margin, currentY, contentWidth, 30, colors.info, colors.primary);
    
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 15, currentY + 12);
    
    // Daily summary
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const summary = `${dayTransactions.length} transações • ${formatCurrency(dayIncome - dayExpense)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 15, currentY + 20);
    
    currentY += 35;
    
    // Transaction cards
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 30);
      addTransactionCard(margin, currentY, transaction, index % 2 === 0);
      currentY += 30;
    });
    
    currentY += 10;
  });

  // Modern footer on all pages
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 20;
    
    addGradientBackground(0, footerY, pageWidth, 20, colors.light, colors.white);
    
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema de Gerenciamento Financeiro - Relatório Detalhado', margin, footerY + 12);
    pdf.text(`${i} / ${totalPages}`, pageWidth - margin - 20, footerY + 12);
  }

  const fileName = `relatorio-detalhado-moderno-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};