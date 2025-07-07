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
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  let currentY = 0;

  // ==================== CABEÇALHO MODERNO ====================
  // Fundo azul do cabeçalho
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 70, 'F');

  // Logo circular
  pdf.setFillColor(255, 255, 255);
  pdf.circle(margin + 15, 25, 12, 'F');
  pdf.setTextColor(59, 130, 246);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SF', margin + 9, 30);

  // Título principal
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO FINANCEIRO', margin + 40, 30);

  // Subtítulo
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Financeiro Profissional', margin + 40, 45);
  
  // Informações do relatório
  pdf.setFontSize(10);
  const periodText = `Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`;
  const generatedText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
  
  pdf.text(periodText, margin + 40, 58);
  pdf.text(generatedText, margin + 40, 68);
  pdf.text(`Usuário: ${userEmail}`, pageWidth - margin - pdf.getTextWidth(`Usuário: ${userEmail}`), 58);

  currentY = 90;

  // ==================== CARDS DE MÉTRICAS ====================
  const cardWidth = (contentWidth - 20) / 3;
  const cardHeight = 80;

  // Card Receitas
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Ícone receitas
  pdf.setFillColor(34, 197, 94);
  pdf.circle(margin + 20, currentY + 20, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('↑', margin + 17, currentY + 24);
  
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('RECEITAS TOTAIS', margin + 35, currentY + 18);
  
  pdf.setTextColor(34, 197, 94);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 15, currentY + 40);
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Entradas no período', margin + 15, currentY + 65);

  // Card Despesas
  const expenseX = margin + cardWidth + 10;
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(expenseX, currentY, cardWidth, cardHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(expenseX, currentY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Ícone despesas
  pdf.setFillColor(239, 68, 68);
  pdf.circle(expenseX + 20, currentY + 20, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('↓', expenseX + 17, currentY + 24);
  
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('DESPESAS TOTAIS', expenseX + 35, currentY + 18);
  
  pdf.setTextColor(239, 68, 68);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), expenseX + 15, currentY + 40);
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Saídas no período', expenseX + 15, currentY + 65);

  // Card Saldo
  const balanceX = margin + (cardWidth + 10) * 2;
  const balanceColor = data.balance >= 0 ? [34, 197, 94] : [239, 68, 68];
  
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(balanceX, currentY, cardWidth, cardHeight, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(balanceX, currentY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Ícone saldo
  pdf.setFillColor(...balanceColor);
  pdf.circle(balanceX + 20, currentY + 20, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('=', balanceX + 17, currentY + 24);
  
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SALDO LÍQUIDO', balanceX + 35, currentY + 18);
  
  pdf.setTextColor(...balanceColor);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), balanceX + 15, currentY + 40);
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Resultado do período', balanceX + 15, currentY + 65);

  currentY += 100;

  // ==================== GRÁFICO DE TENDÊNCIA ====================
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, contentWidth, 100, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 100, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Evolução Financeira Mensal', margin + 15, currentY + 20);

  // Área do gráfico
  const chartX = margin + 20;
  const chartY = currentY + 35;
  const chartWidth = contentWidth - 40;
  const chartHeight = 50;

  // Fundo do gráfico
  pdf.setFillColor(255, 255, 255);
  pdf.rect(chartX, chartY, chartWidth, chartHeight, 'F');

  // Grid do gráfico
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  for (let i = 0; i <= 4; i++) {
    const y = chartY + (chartHeight / 4) * i;
    pdf.line(chartX, y, chartX + chartWidth, y);
  }

  // Dados do gráfico
  if (data.monthlyTrend.length > 0) {
    const maxValue = Math.max(...data.monthlyTrend.map(d => Math.max(d.income, d.expense)));
    const barWidth = (chartWidth / data.monthlyTrend.length) / 3;

    data.monthlyTrend.forEach((month, index) => {
      const x = chartX + (chartWidth / data.monthlyTrend.length) * index + 10;
      const incomeHeight = maxValue > 0 ? (month.income / maxValue) * chartHeight : 0;
      const expenseHeight = maxValue > 0 ? (month.expense / maxValue) * chartHeight : 0;

      // Barra de receitas
      pdf.setFillColor(34, 197, 94);
      pdf.rect(x, chartY + chartHeight - incomeHeight, barWidth, incomeHeight, 'F');

      // Barra de despesas
      pdf.setFillColor(239, 68, 68);
      pdf.rect(x + barWidth + 2, chartY + chartHeight - expenseHeight, barWidth, expenseHeight, 'F');

      // Label do mês
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(month.month, x, chartY + chartHeight + 8);
    });
  }

  // Legenda
  pdf.setFillColor(34, 197, 94);
  pdf.rect(chartX + chartWidth - 80, chartY - 10, 8, 6, 'F');
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(8);
  pdf.text('Receitas', chartX + chartWidth - 68, chartY - 6);

  pdf.setFillColor(239, 68, 68);
  pdf.rect(chartX + chartWidth - 80, chartY - 2, 8, 6, 'F');
  pdf.text('Despesas', chartX + chartWidth - 68, chartY + 2);

  currentY += 120;

  // ==================== ANÁLISE POR CATEGORIA ====================
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, contentWidth, 120, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 120, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Análise por Categoria', margin + 15, currentY + 20);

  // Cabeçalho da tabela
  const tableY = currentY + 35;
  pdf.setFillColor(229, 231, 235);
  pdf.rect(margin + 15, tableY, contentWidth - 30, 12, 'F');
  
  pdf.setTextColor(55, 65, 81);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Categoria', margin + 25, tableY + 8);
  pdf.text('Receitas', margin + 120, tableY + 8);
  pdf.text('Despesas', margin + 180, tableY + 8);
  pdf.text('Saldo', margin + 240, tableY + 8);

  // Linhas da tabela
  let tableRowY = tableY + 15;
  data.transactionsByCategory.slice(0, 5).forEach((category, index) => {
    const balance = category.income - category.expense;
    const rowColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    
    pdf.setFillColor(...rowColor);
    pdf.rect(margin + 15, tableRowY, contentWidth - 30, 12, 'F');
    
    // Indicador de cor da categoria
    const categoryColorRGB = [
      parseInt(category.color.slice(1, 3), 16),
      parseInt(category.color.slice(3, 5), 16),
      parseInt(category.color.slice(5, 7), 16)
    ];
    pdf.setFillColor(...categoryColorRGB);
    pdf.circle(margin + 20, tableRowY + 6, 2, 'F');
    
    // Dados da categoria
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(category.name, margin + 25, tableRowY + 8);
    
    pdf.setTextColor(34, 197, 94);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.income), margin + 120, tableRowY + 8);
    
    pdf.setTextColor(239, 68, 68);
    pdf.text(formatCurrency(category.expense), margin + 180, tableRowY + 8);
    
    pdf.setTextColor(balance >= 0 ? 34 : 239, balance >= 0 ? 197 : 68, balance >= 0 ? 94 : 68);
    pdf.text(formatCurrency(balance), margin + 240, tableRowY + 8);
    
    tableRowY += 12;
  });

  currentY += 140;

  // ==================== TOP CATEGORIAS DE DESPESA ====================
  if (data.topExpenseCategories.length > 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, currentY, contentWidth, 80, 8, 8, 'F');
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, currentY, contentWidth, 80, 8, 8, 'S');
    
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Principais Categorias de Despesa', margin + 15, currentY + 20);

    let rankingY = currentY + 35;
    data.topExpenseCategories.slice(0, 3).forEach((category, index) => {
      // Ranking badge
      pdf.setFillColor(59, 130, 246);
      pdf.circle(margin + 25, rankingY + 6, 6, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 22, rankingY + 9);
      
      // Nome da categoria
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 40, rankingY + 7);
      
      // Percentual
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 40, rankingY + 15);
      
      // Valor
      pdf.setTextColor(239, 68, 68);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 20, rankingY + 9);
      
      rankingY += 18;
    });

    currentY += 100;
  }

  // ==================== RODAPÉ ====================
  const footerY = pageHeight - 25;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, footerY, pageWidth, 25, 'F');
  
  // Logo pequeno no rodapé
  pdf.setFillColor(59, 130, 246);
  pdf.circle(margin + 8, footerY + 12, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SF', margin + 5, footerY + 15);
  
  // Informações do rodapé
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Financeiro Profissional', margin + 20, footerY + 10);
  pdf.text('contato@sistemafinanceiro.com.br', margin + 20, footerY + 18);
  
  // Página
  pdf.text('Página 1', pageWidth - margin - 20, footerY + 14);

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
      addHeader();
      return 80;
    }
    return currentY;
  };

  const addHeader = () => {
    // Cabeçalho moderno
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 60, 'F');
    
    // Logo
    pdf.setFillColor(255, 255, 255);
    pdf.circle(margin + 12, 20, 10, 'F');
    pdf.setTextColor(59, 130, 246);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SF', margin + 7, 25);

    // Título
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RELATÓRIO DETALHADO', margin + 30, 25);
    
    // Informações
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin + 30, 38);
    pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin + 30, 48);
    pdf.text(`Usuário: ${userEmail}`, pageWidth - margin - pdf.getTextWidth(`Usuário: ${userEmail}`), 38);
  };

  let currentY = 0;
  addHeader();
  currentY = 80;

  // ==================== RESUMO EXECUTIVO ====================
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, contentWidth, 80, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 80, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Executivo', margin + 15, currentY + 20);

  // Grid de métricas
  const metricsY = currentY + 35;

  // Receitas
  pdf.setFillColor(34, 197, 94);
  pdf.circle(margin + 25, metricsY + 8, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('↑', margin + 22, metricsY + 11);
  
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Receitas:', margin + 35, metricsY + 8);
  pdf.setTextColor(34, 197, 94);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 35, metricsY + 18);

  // Despesas
  pdf.setFillColor(239, 68, 68);
  pdf.circle(margin + 25, metricsY + 30, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('↓', margin + 22, metricsY + 33);
  
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Despesas:', margin + 35, metricsY + 30);
  pdf.setTextColor(239, 68, 68);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), margin + 35, metricsY + 40);

  // Estatísticas adicionais
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total de Transações: ${transactions.length}`, margin + 150, metricsY + 12);
  pdf.text(`Saldo Líquido: ${formatCurrency(data.balance)}`, margin + 150, metricsY + 22);
  pdf.text(`Categorias Ativas: ${data.transactionsByCategory.length}`, margin + 150, metricsY + 32);

  currentY += 100;

  // ==================== DETALHAMENTO DE TRANSAÇÕES ====================
  currentY = checkPageBreak(currentY, 60);
  
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, contentWidth, 30, 8, 8, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, contentWidth, 30, 8, 8, 'S');
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento Completo de Transações', margin + 15, currentY + 20);

  currentY += 50;

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
    
    // Header da data
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin, currentY, contentWidth, 20, 8, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 15, currentY + 13);
    
    // Resumo do dia
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    pdf.setFontSize(9);
    const summary = `${dayTransactions.length} transações • Saldo: ${formatCurrency(dayBalance)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 15, currentY + 13);
    
    currentY += 30;
    
    // Transações do dia
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 25);
      
      // Card da transação
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      pdf.setFillColor(...bgColor);
      pdf.roundedRect(margin, currentY, contentWidth, 20, 5, 5, 'F');
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, currentY, contentWidth, 20, 5, 5, 'S');
      
      // Indicador de tipo
      const typeColor = transaction.type === 'income' ? [34, 197, 94] : [239, 68, 68];
      pdf.setFillColor(...typeColor);
      pdf.roundedRect(margin + 5, currentY + 5, 4, 10, 2, 2, 'F');
      
      // Descrição
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.description, margin + 15, currentY + 10);
      
      // Categoria e conta
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${transaction.category} • ${transaction.account}`, margin + 15, currentY + 17);
      
      // Valor
      pdf.setTextColor(...typeColor);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 15, currentY + 12);
      
      currentY += 25;
    });
    
    currentY += 10;
  });

  // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 20;
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, footerY, pageWidth, 20, 'F');
    
    // Logo pequeno
    pdf.setFillColor(59, 130, 246);
    pdf.circle(margin + 8, footerY + 10, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SF', margin + 5, footerY + 13);
    
    // Informações
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema Financeiro Profissional - Relatório Detalhado', margin + 18, footerY + 8);
    pdf.text('contato@sistemafinanceiro.com.br', margin + 18, footerY + 15);
    
    // Numeração
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 30, footerY + 12);
  }

  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};