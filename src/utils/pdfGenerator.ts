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

export const generatePDFReport = async (data: ReportData, userEmail: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  let currentY = margin;

  // Header moderno e limpo
  pdf.setFillColor(59, 130, 246); // blue-500
  pdf.rect(0, 0, pageWidth, 80, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relatório Financeiro', margin, 30);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 45);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 55);
  pdf.text(`Usuário: ${userEmail}`, margin, 65);

  currentY = 100;

  // Cards de resumo limpos
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo do Período', margin, currentY);
  currentY += 20;

  const cardWidth = (contentWidth - 20) / 3;
  const cardHeight = 60;

  // Card Receitas
  pdf.setFillColor(240, 253, 244); // green-50
  pdf.rect(margin, currentY, cardWidth, cardHeight, 'F');
  pdf.setDrawColor(34, 197, 94); // green-500
  pdf.setLineWidth(2);
  pdf.rect(margin, currentY, cardWidth, cardHeight, 'S');
  
  pdf.setTextColor(22, 163, 74); // green-600
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEITAS TOTAIS', margin + 10, currentY + 15);
  
  pdf.setFontSize(16);
  pdf.text(formatCurrency(data.totalIncome), margin + 10, currentY + 35);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Entradas no período', margin + 10, currentY + 50);

  // Card Despesas
  const expenseX = margin + cardWidth + 10;
  pdf.setFillColor(254, 242, 242); // red-50
  pdf.rect(expenseX, currentY, cardWidth, cardHeight, 'F');
  pdf.setDrawColor(239, 68, 68); // red-500
  pdf.rect(expenseX, currentY, cardWidth, cardHeight, 'S');
  
  pdf.setTextColor(220, 38, 38); // red-600
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESPESAS TOTAIS', expenseX + 10, currentY + 15);
  
  pdf.setFontSize(16);
  pdf.text(formatCurrency(data.totalExpenses), expenseX + 10, currentY + 35);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saídas no período', expenseX + 10, currentY + 50);

  // Card Saldo
  const balanceX = margin + (cardWidth + 10) * 2;
  const balanceColor = data.balance >= 0 ? [240, 253, 244] : [254, 242, 242]; // green-50 or red-50
  const balanceBorder = data.balance >= 0 ? [34, 197, 94] : [239, 68, 68]; // green-500 or red-500
  const balanceText = data.balance >= 0 ? [22, 163, 74] : [220, 38, 38]; // green-600 or red-600
  
  pdf.setFillColor(...balanceColor);
  pdf.rect(balanceX, currentY, cardWidth, cardHeight, 'F');
  pdf.setDrawColor(...balanceBorder);
  pdf.rect(balanceX, currentY, cardWidth, cardHeight, 'S');
  
  pdf.setTextColor(...balanceText);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SALDO LÍQUIDO', balanceX + 10, currentY + 15);
  
  pdf.setFontSize(16);
  pdf.text(formatCurrency(data.balance), balanceX + 10, currentY + 35);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.balance >= 0 ? 'Resultado positivo' : 'Resultado negativo', balanceX + 10, currentY + 50);

  currentY += 80;

  // Seção de categorias
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Análise por Categoria', margin, currentY);
  currentY += 20;

  // Tabela limpa de categorias
  const tableHeaders = ['Categoria', 'Receitas', 'Despesas', 'Saldo'];
  const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
  let tableX = margin;

  // Header da tabela
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(margin, currentY, contentWidth, 15, 'F');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  
  tableHeaders.forEach((header, index) => {
    pdf.text(header, tableX + 5, currentY + 10);
    tableX += colWidths[index];
  });

  currentY += 15;

  // Linhas da tabela
  data.transactionsByCategory.slice(0, 10).forEach((category, index) => {
    const balance = category.income - category.expense;
    const rowColor = index % 2 === 0 ? [255, 255, 255] : [249, 250, 251]; // white or gray-50
    
    pdf.setFillColor(...rowColor);
    pdf.rect(margin, currentY, contentWidth, 12, 'F');
    
    tableX = margin;
    
    // Nome da categoria
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(category.name, tableX + 5, currentY + 8);
    tableX += colWidths[0];
    
    // Receitas
    pdf.setTextColor(22, 163, 74); // green-600
    pdf.text(formatCurrency(category.income), tableX + 5, currentY + 8);
    tableX += colWidths[1];
    
    // Despesas
    pdf.setTextColor(220, 38, 38); // red-600
    pdf.text(formatCurrency(category.expense), tableX + 5, currentY + 8);
    tableX += colWidths[2];
    
    // Saldo
    pdf.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
    pdf.text(formatCurrency(balance), tableX + 5, currentY + 8);
    
    currentY += 12;
  });

  // Borda da tabela
  pdf.setDrawColor(229, 231, 235); // gray-200
  pdf.setLineWidth(0.5);
  pdf.rect(margin, currentY - (data.transactionsByCategory.slice(0, 10).length * 12) - 15, contentWidth, (data.transactionsByCategory.slice(0, 10).length * 12) + 15, 'S');

  currentY += 20;

  // Top categorias de despesa
  if (data.topExpenseCategories.length > 0) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Principais Categorias de Despesa', margin, currentY);
    currentY += 20;

    data.topExpenseCategories.slice(0, 5).forEach((category, index) => {
      // Card simples para cada categoria
      pdf.setFillColor(249, 250, 251); // gray-50
      pdf.rect(margin, currentY, contentWidth, 20, 'F');
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.rect(margin, currentY, contentWidth, 20, 'S');
      
      // Número do ranking
      pdf.setFillColor(59, 130, 246); // blue-500
      pdf.rect(margin + 10, currentY + 5, 15, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 16, currentY + 12);
      
      // Nome da categoria
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 35, currentY + 10);
      
      // Percentual
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 35, currentY + 17);
      
      // Valor
      pdf.setTextColor(220, 38, 38); // red-600
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 10, currentY + 12);
      
      currentY += 25;
    });
  }

  // Footer limpo
  const footerY = pageHeight - 20;
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(0, footerY - 5, pageWidth, 25, 'F');
  
  pdf.setTextColor(107, 114, 128); // gray-500
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gerenciamento Financeiro', margin, footerY + 5);
  pdf.text('Página 1', pageWidth - margin - 20, footerY + 5);

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
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 30) {
      pdf.addPage();
      return 30;
    }
    return currentY;
  };

  let currentY = margin;

  // Header limpo
  pdf.setFillColor(59, 130, 246); // blue-500
  pdf.rect(0, 0, pageWidth, 80, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relatório Detalhado', margin, 30);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 45);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 55);
  pdf.text(`Usuário: ${userEmail}`, margin, 65);

  currentY = 100;

  // Resumo executivo
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Executivo', margin, currentY);
  currentY += 15;

  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(margin, currentY, contentWidth, 40, 'F');
  pdf.setDrawColor(203, 213, 225); // slate-300
  pdf.rect(margin, currentY, contentWidth, 40, 'S');

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  pdf.text('Receitas:', margin + 10, currentY + 12);
  pdf.setTextColor(22, 163, 74); // green-600
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 50, currentY + 12);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Despesas:', margin + 10, currentY + 22);
  pdf.setTextColor(220, 38, 38); // red-600
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), margin + 50, currentY + 22);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saldo:', margin + 10, currentY + 32);
  pdf.setTextColor(data.balance >= 0 ? 22 : 220, data.balance >= 0 ? 163 : 38, data.balance >= 0 ? 74 : 38);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), margin + 50, currentY + 32);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total de Transações: ${transactions.length}`, margin + 120, currentY + 22);

  currentY += 60;

  // Transações por data
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento de Transações', margin, currentY);
  currentY += 20;

  // Agrupar transações por data
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
    
    currentY = checkPageBreak(currentY, 60);
    
    // Header da data
    pdf.setFillColor(59, 130, 246); // blue-500
    pdf.rect(margin, currentY, contentWidth, 20, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 10, currentY + 13);
    
    // Resumo do dia
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    pdf.setFontSize(10);
    const summary = `${dayTransactions.length} transações • Saldo: ${formatCurrency(dayBalance)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 10, currentY + 13);
    
    currentY += 25;
    
    // Transações do dia
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 25);
      
      const typeColor = transaction.type === 'income' ? [22, 163, 74] : [220, 38, 38]; // green-600 or red-600
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [249, 250, 251]; // white or gray-50
      
      pdf.setFillColor(...bgColor);
      pdf.rect(margin, currentY, contentWidth, 20, 'F');
      
      // Indicador de tipo
      pdf.setFillColor(...typeColor);
      pdf.rect(margin + 5, currentY + 5, 4, 10, 'F');
      
      // Descrição
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.description, margin + 15, currentY + 10);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(`${transaction.category} • ${transaction.account}`, margin + 15, currentY + 17);
      
      // Valor
      pdf.setTextColor(...typeColor);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 10, currentY + 12);
      
      currentY += 20;
    });
    
    currentY += 10;
  });

  // Footer em todas as páginas
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 15;
    
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(0, footerY - 5, pageWidth, 20, 'F');
    
    pdf.setTextColor(107, 114, 128); // gray-500
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema de Gerenciamento Financeiro - Relatório Detalhado', margin, footerY + 5);
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 30, footerY + 5);
  }

  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};