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
  
  // Colors
  const primaryColor = [37, 99, 235]; // blue-600
  const successColor = [5, 150, 105]; // emerald-600
  const dangerColor = [220, 38, 38]; // red-600
  const grayColor = [107, 114, 128]; // gray-500

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Helper function to add a new page if needed
  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      return margin;
    }
    return currentY;
  };

  let currentY = margin;

  // Header
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 60, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relatório Financeiro', margin, 25);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 35);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 45);
  pdf.text(`Usuário: ${userEmail}`, margin, 55);

  currentY = 80;

  // Summary Cards
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo do Período', margin, currentY);
  currentY += 15;

  // Income Card
  pdf.setFillColor(240, 253, 244); // green-50
  pdf.rect(margin, currentY, contentWidth / 3 - 5, 40, 'F');
  pdf.setDrawColor(34, 197, 94); // green-500
  pdf.setLineWidth(0.5);
  pdf.rect(margin, currentY, contentWidth / 3 - 5, 40, 'S');
  
  pdf.setTextColor(...successColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total de Receitas', margin + 5, currentY + 10);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 5, currentY + 25);

  // Expense Card
  const expenseCardX = margin + (contentWidth / 3);
  pdf.setFillColor(254, 242, 242); // red-50
  pdf.rect(expenseCardX, currentY, contentWidth / 3 - 5, 40, 'F');
  pdf.setDrawColor(239, 68, 68); // red-500
  pdf.rect(expenseCardX, currentY, contentWidth / 3 - 5, 40, 'S');
  
  pdf.setTextColor(...dangerColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total de Despesas', expenseCardX + 5, currentY + 10);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), expenseCardX + 5, currentY + 25);

  // Balance Card
  const balanceCardX = margin + (contentWidth / 3) * 2;
  const balanceColor = data.balance >= 0 ? [240, 253, 244] : [254, 242, 242]; // green-50 or red-50
  const balanceBorderColor = data.balance >= 0 ? [34, 197, 94] : [239, 68, 68]; // green-500 or red-500
  const balanceTextColor = data.balance >= 0 ? successColor : dangerColor;
  
  pdf.setFillColor(...balanceColor);
  pdf.rect(balanceCardX, currentY, contentWidth / 3 - 5, 40, 'F');
  pdf.setDrawColor(...balanceBorderColor);
  pdf.rect(balanceCardX, currentY, contentWidth / 3 - 5, 40, 'S');
  
  pdf.setTextColor(...balanceTextColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saldo do Período', balanceCardX + 5, currentY + 10);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), balanceCardX + 5, currentY + 25);

  currentY += 60;

  // Transactions by Category Table
  currentY = checkPageBreak(currentY, 100);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Transações por Categoria', margin, currentY);
  currentY += 15;

  // Table header
  const tableStartY = currentY;
  const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];

  pdf.setFillColor(243, 244, 246); // gray-100
  pdf.rect(margin, currentY, contentWidth, 12, 'F');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Categoria', colPositions[0] + 2, currentY + 8);
  pdf.text('Receitas', colPositions[1] + 2, currentY + 8);
  pdf.text('Despesas', colPositions[2] + 2, currentY + 8);
  pdf.text('Saldo', colPositions[3] + 2, currentY + 8);

  currentY += 12;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  data.transactionsByCategory.forEach((category, index) => {
    currentY = checkPageBreak(currentY, 12);
    
    const balance = category.income - category.expense;
    const rowColor = index % 2 === 0 ? [255, 255, 255] : [249, 250, 251]; // white or gray-50
    
    pdf.setFillColor(...rowColor);
    pdf.rect(margin, currentY, contentWidth, 12, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.text(category.name, colPositions[0] + 2, currentY + 8);
    
    pdf.setTextColor(...successColor);
    pdf.text(formatCurrency(category.income), colPositions[1] + 2, currentY + 8);
    
    pdf.setTextColor(...dangerColor);
    pdf.text(formatCurrency(category.expense), colPositions[2] + 2, currentY + 8);
    
    pdf.setTextColor(...(balance >= 0 ? successColor : dangerColor));
    pdf.text(formatCurrency(balance), colPositions[3] + 2, currentY + 8);
    
    currentY += 12;
  });

  // Add border to table
  pdf.setDrawColor(209, 213, 219); // gray-300
  pdf.setLineWidth(0.1);
  pdf.rect(margin, tableStartY, contentWidth, currentY - tableStartY, 'S');
  
  // Vertical lines
  colPositions.slice(1).forEach(pos => {
    pdf.line(pos, tableStartY, pos, currentY);
  });

  currentY += 20;

  // Top Expense Categories
  if (data.topExpenseCategories.length > 0) {
    currentY = checkPageBreak(currentY, 80);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Principais Categorias de Despesa', margin, currentY);
    currentY += 15;

    data.topExpenseCategories.forEach((category, index) => {
      currentY = checkPageBreak(currentY, 20);
      
      // Category item
      pdf.setFillColor(249, 250, 251); // gray-50
      pdf.rect(margin, currentY, contentWidth, 18, 'F');
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.rect(margin, currentY, contentWidth, 18, 'S');
      
      // Rank circle
      pdf.setFillColor(59, 130, 246); // blue-500
      pdf.circle(margin + 10, currentY + 9, 6, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 7, currentY + 12);
      
      // Category name
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 25, currentY + 8);
      
      // Amount and percentage
      pdf.setTextColor(...grayColor);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 25, currentY + 15);
      
      // Amount
      pdf.setTextColor(...dangerColor);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 5, currentY + 12);
      
      currentY += 25;
    });
  }

  // Footer
  const footerY = pageHeight - 20;
  pdf.setFillColor(243, 244, 246); // gray-100
  pdf.rect(0, footerY - 10, pageWidth, 30, 'F');
  
  pdf.setTextColor(...grayColor);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gerenciamento Financeiro', margin, footerY);
  pdf.text(`Página ${pdf.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 20, footerY);

  // Save the PDF
  const fileName = `relatorio-financeiro-resumo-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
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
  
  // Colors
  const primaryColor = [37, 99, 235]; // blue-600
  const successColor = [5, 150, 105]; // emerald-600
  const dangerColor = [220, 38, 38]; // red-600
  const grayColor = [107, 114, 128]; // gray-500

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Helper function to add a new page if needed
  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      return margin;
    }
    return currentY;
  };

  let currentY = margin;

  // Header
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 60, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relatório Financeiro Detalhado', margin, 25);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 35);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 45);
  pdf.text(`Usuário: ${userEmail}`, margin, 55);

  currentY = 80;

  // Summary Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Executivo', margin, currentY);
  currentY += 15;

  // Summary stats in a box
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(margin, currentY, contentWidth, 50, 'F');
  pdf.setDrawColor(203, 213, 225); // slate-300
  pdf.rect(margin, currentY, contentWidth, 50, 'S');

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  pdf.text('Total de Receitas:', margin + 10, currentY + 15);
  pdf.setTextColor(...successColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 60, currentY + 15);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total de Despesas:', margin + 10, currentY + 25);
  pdf.setTextColor(...dangerColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), margin + 60, currentY + 25);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saldo do Período:', margin + 10, currentY + 35);
  pdf.setTextColor(...(data.balance >= 0 ? successColor : dangerColor));
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), margin + 60, currentY + 35);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total de Transações: ${transactions.length}`, margin + 10, currentY + 45);

  currentY += 70;

  // Transactions Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento de Transações', margin, currentY);
  currentY += 15;

  // Group transactions by date
  const transactionsByDate = transactions.reduce((acc, transaction) => {
    const date = transaction.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(transactionsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  sortedDates.forEach(date => {
    const dayTransactions = transactionsByDate[date];
    
    // Check if we need a new page
    const requiredHeight = (dayTransactions.length * 25) + 40;
    currentY = checkPageBreak(currentY, requiredHeight);
    
    // Date header
    pdf.setFillColor(59, 130, 246); // blue-500
    pdf.rect(margin, currentY, contentWidth, 15, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 5, currentY + 10);
    
    // Daily totals
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    pdf.setFontSize(10);
    const dailySummary = `Receitas: ${formatCurrency(dayIncome)} | Despesas: ${formatCurrency(dayExpense)} | Saldo: ${formatCurrency(dayBalance)}`;
    const summaryWidth = pdf.getTextWidth(dailySummary);
    pdf.text(dailySummary, pageWidth - margin - summaryWidth - 5, currentY + 10);
    
    currentY += 15;
    
    // Transactions for this date
    dayTransactions.forEach((transaction, index) => {
      const typeColor = transaction.type === 'income' ? successColor : dangerColor;
      const typeSymbol = transaction.type === 'income' ? '+' : '-';
      
      // Alternate row colors
      const rowColor = index % 2 === 0 ? [255, 255, 255] : [249, 250, 251]; // white or gray-50
      pdf.setFillColor(...rowColor);
      pdf.rect(margin, currentY, contentWidth, 25, 'F');
      
      // Transaction details
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.description, margin + 5, currentY + 8);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...grayColor);
      pdf.text(`${transaction.category} • ${transaction.account}`, margin + 5, currentY + 16);
      
      // Amount
      pdf.setTextColor(...typeColor);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${typeSymbol}${formatCurrency(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 5, currentY + 12);
      
      // Type indicator
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.type === 'income' ? 'RECEITA' : 'DESPESA', pageWidth - margin - amountWidth - 5, currentY + 20);
      
      currentY += 25;
    });
    
    currentY += 10;
  });

  // Add summary page if there are many transactions
  if (transactions.length > 20) {
    pdf.addPage();
    currentY = margin;
    
    // Summary statistics
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Estatísticas do Período', margin, currentY);
    currentY += 20;
    
    // Category breakdown
    if (data.transactionsByCategory.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Resumo por Categoria', margin, currentY);
      currentY += 15;
      
      data.transactionsByCategory.forEach((category, index) => {
        currentY = checkPageBreak(currentY, 15);
        
        const balance = category.income - category.expense;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${index + 1}. ${category.name}`, margin + 5, currentY + 5);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...grayColor);
        pdf.text(`Receitas: ${formatCurrency(category.income)} | Despesas: ${formatCurrency(category.expense)}`, margin + 10, currentY + 12);
        
        pdf.setTextColor(...(balance >= 0 ? successColor : dangerColor));
        pdf.text(`Saldo: ${formatCurrency(balance)}`, margin + 10, currentY + 19);
        
        currentY += 25;
      });
    }
  }

  // Footer on all pages
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 15;
    
    pdf.setFillColor(243, 244, 246); // gray-100
    pdf.rect(0, footerY - 5, pageWidth, 20, 'F');
    
    pdf.setTextColor(...grayColor);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema de Gerenciamento Financeiro - Relatório Detalhado', margin, footerY);
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 30, footerY);
  }

  // Save the PDF
  const fileName = `relatorio-financeiro-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};