import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

export const generatePDFReport = async (data: ReportData, userEmail: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Colors
  const primaryColor = '#2563EB';
  const successColor = '#059669';
  const dangerColor = '#DC2626';
  const grayColor = '#6B7280';
  const lightGrayColor = '#F3F4F6';

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
  pdf.setFillColor(primaryColor);
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
  
  pdf.setTextColor(5, 150, 105); // green-600
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
  
  pdf.setTextColor(220, 38, 38); // red-600
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
  const balanceTextColor = data.balance >= 0 ? [5, 150, 105] : [220, 38, 38]; // green-600 or red-600
  
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
    
    pdf.setTextColor(5, 150, 105); // green-600
    pdf.text(formatCurrency(category.income), colPositions[1] + 2, currentY + 8);
    
    pdf.setTextColor(220, 38, 38); // red-600
    pdf.text(formatCurrency(category.expense), colPositions[2] + 2, currentY + 8);
    
    pdf.setTextColor(balance >= 0 ? 5 : 220, balance >= 0 ? 150 : 38, balance >= 0 ? 105 : 38);
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
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 25, currentY + 15);
      
      // Amount
      pdf.setTextColor(220, 38, 38); // red-600
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
  
  pdf.setTextColor(107, 114, 128); // gray-500
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gerenciamento Financeiro', margin, footerY);
  pdf.text(`Página ${pdf.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 20, footerY);

  // Save the PDF
  const fileName = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};

export const generateDetailedPDFReport = async (
  data: ReportData,
  userEmail: string,
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    category: string;
    account: string;
  }>
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // First, generate the summary report
  await generatePDFReport(data, userEmail);
  
  // Then add detailed transactions
  pdf.addPage();
  
  let currentY = margin;
  
  // Header for transactions page
  pdf.setFillColor(37, 99, 235); // blue-600
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento de Transações', margin, 25);
  
  currentY = 60;
  
  // Group transactions by date
  const transactionsByDate = transactions.reduce((acc, transaction) => {
    const date = transaction.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, typeof transactions>);
  
  // Sort dates in descending order
  const sortedDates = Object.keys(transactionsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  sortedDates.forEach(date => {
    const dayTransactions = transactionsByDate[date];
    
    // Check if we need a new page
    if (currentY + (dayTransactions.length * 15) + 30 > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }
    
    // Date header
    pdf.setFillColor(243, 244, 246); // gray-100
    pdf.rect(margin, currentY, contentWidth, 15, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR }), margin + 5, currentY + 10);
    
    currentY += 15;
    
    // Transactions for this date
    dayTransactions.forEach(transaction => {
      const typeColor = transaction.type === 'income' ? [5, 150, 105] : [220, 38, 38]; // green-600 or red-600
      const typeSymbol = transaction.type === 'income' ? '+' : '-';
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.description, margin + 5, currentY + 8);
      pdf.text(transaction.category, margin + 5, currentY + 15);
      
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.setFontSize(8);
      pdf.text(transaction.account, margin + 5, currentY + 20);
      
      // Amount
      pdf.setTextColor(...typeColor);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${typeSymbol}${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 5, currentY + 12);
      
      // Separator line
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.setLineWidth(0.1);
      pdf.line(margin, currentY + 25, pageWidth - margin, currentY + 25);
      
      currentY += 30;
    });
    
    currentY += 10;
  });
  
  // Save the detailed PDF
  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};