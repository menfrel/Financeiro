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

  // Header moderno com gradiente azul
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 70, 'F');
  
  // Título principal
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO FINANCEIRO', margin, 30);
  
  // Subtítulo e informações
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 45);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 55);
  pdf.text(`Usuário: ${userEmail}`, margin, 65);

  currentY = 90;

  // Cards de resumo estilo moderno
  const cardWidth = (contentWidth - 20) / 3;
  const cardHeight = 70;

  // Card Receitas - Verde
  pdf.setFillColor(34, 197, 94);
  pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 8, 8, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEITAS TOTAIS', margin + 15, currentY + 20);
  
  pdf.setFontSize(20);
  pdf.text(formatCurrency(data.totalIncome), margin + 15, currentY + 40);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Entradas no período', margin + 15, currentY + 55);

  // Card Despesas - Vermelho
  const expenseX = margin + cardWidth + 10;
  pdf.setFillColor(239, 68, 68);
  pdf.roundedRect(expenseX, currentY, cardWidth, cardHeight, 8, 8, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESPESAS TOTAIS', expenseX + 15, currentY + 20);
  
  pdf.setFontSize(20);
  pdf.text(formatCurrency(data.totalExpenses), expenseX + 15, currentY + 40);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saídas no período', expenseX + 15, currentY + 55);

  // Card Saldo - Azul ou Verde dependendo do resultado
  const balanceX = margin + (cardWidth + 10) * 2;
  const balanceColor = data.balance >= 0 ? [34, 197, 94] : [239, 68, 68];
  
  pdf.setFillColor(...balanceColor);
  pdf.roundedRect(balanceX, currentY, cardWidth, cardHeight, 8, 8, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SALDO LÍQUIDO', balanceX + 15, currentY + 20);
  
  pdf.setFontSize(20);
  pdf.text(formatCurrency(data.balance), balanceX + 15, currentY + 40);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.balance >= 0 ? 'Resultado positivo' : 'Resultado negativo', balanceX + 15, currentY + 55);

  currentY += 90;

  // Seção de categorias com design moderno
  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Análise por Categoria', margin, currentY);
  currentY += 25;

  // Container para a tabela
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, contentWidth, 15, 5, 5, 'F');
  
  // Headers da tabela
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  
  const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
  let tableX = margin;
  
  pdf.text('Categoria', tableX + 10, currentY + 10);
  tableX += colWidths[0];
  pdf.text('Receitas', tableX + 10, currentY + 10);
  tableX += colWidths[1];
  pdf.text('Despesas', tableX + 10, currentY + 10);
  tableX += colWidths[2];
  pdf.text('Saldo', tableX + 10, currentY + 10);

  currentY += 20;

  // Linhas da tabela com design alternado
  data.transactionsByCategory.slice(0, 8).forEach((category, index) => {
    const balance = category.income - category.expense;
    const rowColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    
    pdf.setFillColor(...rowColor);
    pdf.rect(margin, currentY, contentWidth, 15, 'F');
    
    tableX = margin;
    
    // Nome da categoria com indicador colorido
    pdf.setFillColor(parseInt(category.color.slice(1, 3), 16), parseInt(category.color.slice(3, 5), 16), parseInt(category.color.slice(5, 7), 16));
    pdf.circle(tableX + 8, currentY + 7.5, 3, 'F');
    
    pdf.setTextColor(51, 65, 85);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(category.name, tableX + 18, currentY + 10);
    tableX += colWidths[0];
    
    // Receitas
    pdf.setTextColor(34, 197, 94);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.income), tableX + 10, currentY + 10);
    tableX += colWidths[1];
    
    // Despesas
    pdf.setTextColor(239, 68, 68);
    pdf.text(formatCurrency(category.expense), tableX + 10, currentY + 10);
    tableX += colWidths[2];
    
    // Saldo
    pdf.setTextColor(balance >= 0 ? 34 : 239, balance >= 0 ? 197 : 68, balance >= 0 ? 94 : 68);
    pdf.text(formatCurrency(balance), tableX + 10, currentY + 10);
    
    currentY += 15;
  });

  currentY += 20;

  // Top categorias de despesa
  if (data.topExpenseCategories.length > 0) {
    pdf.setTextColor(51, 65, 85);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Principais Categorias de Despesa', margin, currentY);
    currentY += 25;

    data.topExpenseCategories.slice(0, 5).forEach((category, index) => {
      // Card para cada categoria
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, currentY, contentWidth, 25, 8, 8, 'F');
      
      // Sombra sutil
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, currentY, contentWidth, 25, 8, 8, 'S');
      
      // Ranking
      pdf.setFillColor(59, 130, 246);
      pdf.circle(margin + 20, currentY + 12.5, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 17, currentY + 16);
      
      // Nome da categoria
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 40, currentY + 12);
      
      // Percentual
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 40, currentY + 20);
      
      // Valor
      pdf.setTextColor(239, 68, 68);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 15, currentY + 16);
      
      currentY += 30;
    });
  }

  // Footer elegante
  const footerY = pageHeight - 25;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, footerY, pageWidth, 25, 'F');
  
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gerenciamento Financeiro', margin, footerY + 15);
  pdf.text('Página 1', pageWidth - margin - 20, footerY + 15);

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
    if (currentY + requiredHeight > pageHeight - 40) {
      pdf.addPage();
      return 30;
    }
    return currentY;
  };

  let currentY = margin;

  // Header moderno
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 70, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO DETALHADO', margin, 30);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 45);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 55);
  pdf.text(`Usuário: ${userEmail}`, margin, 65);

  currentY = 90;

  // Resumo executivo moderno
  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Executivo', margin, currentY);
  currentY += 20;

  // Container do resumo
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, contentWidth, 50, 8, 8, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 50, 8, 8, 'S');

  // Grid de informações
  const infoY = currentY + 15;
  
  // Receitas
  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Receitas:', margin + 15, infoY);
  pdf.setTextColor(34, 197, 94);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 70, infoY);

  // Despesas
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Despesas:', margin + 15, infoY + 12);
  pdf.setTextColor(239, 68, 68);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), margin + 70, infoY + 12);

  // Saldo
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saldo:', margin + 15, infoY + 24);
  pdf.setTextColor(data.balance >= 0 ? 34 : 239, data.balance >= 0 ? 197 : 68, data.balance >= 0 ? 94 : 68);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), margin + 70, infoY + 24);

  // Informações adicionais
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total de Transações: ${transactions.length}`, margin + 120, infoY + 12);

  currentY += 70;

  // Seção de transações detalhadas
  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento de Transações', margin, currentY);
  currentY += 25;

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
    
    currentY = checkPageBreak(currentY, 80);
    
    // Header da data com design moderno
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin, currentY, contentWidth, 20, 8, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 15, currentY + 13);
    
    // Resumo do dia
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    pdf.setFontSize(11);
    const summary = `${dayTransactions.length} transações • Saldo: ${formatCurrency(dayBalance)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 15, currentY + 13);
    
    currentY += 25;
    
    // Transações do dia
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 25);
      
      const typeColor = transaction.type === 'income' ? [34, 197, 94] : [239, 68, 68];
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      
      // Background da transação
      pdf.setFillColor(...bgColor);
      pdf.roundedRect(margin, currentY, contentWidth, 22, 5, 5, 'F');
      
      // Indicador de tipo (barra lateral colorida)
      pdf.setFillColor(...typeColor);
      pdf.roundedRect(margin + 5, currentY + 3, 4, 16, 2, 2, 'F');
      
      // Descrição da transação
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.description, margin + 20, currentY + 10);
      
      // Categoria e conta
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${transaction.category} • ${transaction.account}`, margin + 20, currentY + 18);
      
      // Valor da transação
      pdf.setTextColor(...typeColor);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 15, currentY + 12);
      
      // Tipo da transação
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.type === 'income' ? 'RECEITA' : 'DESPESA', pageWidth - margin - amountWidth - 15, currentY + 19);
      
      currentY += 25;
    });
    
    currentY += 15;
  });

  // Footer em todas as páginas
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 20;
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, footerY - 5, pageWidth, 25, 'F');
    
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema de Gerenciamento Financeiro - Relatório Detalhado', margin, footerY + 5);
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 30, footerY + 5);
  }

  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};