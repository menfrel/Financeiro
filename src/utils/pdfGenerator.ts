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

// Paleta de cores profissional
const colors = {
  primary: [59, 130, 246],      // Azul principal
  secondary: [99, 102, 241],    // Índigo
  success: [34, 197, 94],       // Verde
  danger: [239, 68, 68],        // Vermelho
  warning: [245, 158, 11],      // Amarelo
  info: [14, 165, 233],         // Azul claro
  gray: {
    50: [249, 250, 251],
    100: [243, 244, 246],
    200: [229, 231, 235],
    300: [209, 213, 219],
    400: [156, 163, 175],
    500: [107, 114, 128],
    600: [75, 85, 99],
    700: [55, 65, 81],
    800: [31, 41, 55],
    900: [17, 24, 39]
  }
};

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

  const drawCard = (x: number, y: number, width: number, height: number, elevation = 2) => {
    // Sombra para elevação
    for (let i = 0; i < elevation; i++) {
      pdf.setFillColor(0, 0, 0, 0.1);
      pdf.roundedRect(x + i, y + i, width, height, 8, 8, 'F');
    }
    
    // Card principal
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 8, 8, 'F');
    
    // Borda sutil
    pdf.setDrawColor(...colors.gray[200]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, width, height, 8, 8, 'S');
  };

  const drawIcon = (x: number, y: number, type: 'income' | 'expense' | 'balance' | 'chart') => {
    const iconSize = 12;
    const iconColor = type === 'income' ? colors.success : 
                     type === 'expense' ? colors.danger : 
                     type === 'balance' ? colors.primary : colors.secondary;
    
    pdf.setFillColor(...iconColor);
    pdf.circle(x + iconSize/2, y + iconSize/2, iconSize/2, 'F');
    
    // Ícone simplificado
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const iconText = type === 'income' ? '↑' : 
                    type === 'expense' ? '↓' : 
                    type === 'balance' ? '=' : '📊';
    pdf.text(iconText, x + iconSize/2 - 2, y + iconSize/2 + 2);
  };

  let currentY = 0;

  // ==================== CABEÇALHO MODERNO ====================
  // Gradiente de fundo
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 80, 'F');
  
  // Overlay com gradiente simulado
  pdf.setFillColor(255, 255, 255, 0.1);
  pdf.rect(0, 0, pageWidth, 80, 'F');

  // Logo simulado (círculo com iniciais)
  pdf.setFillColor(255, 255, 255);
  pdf.circle(margin + 15, 25, 15, 'F');
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SF', margin + 8, 30);

  // Título principal
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO FINANCEIRO', margin + 40, 30);

  // Subtítulo e informações
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Financeiro Profissional', margin + 40, 42);
  
  // Informações do relatório
  pdf.setFontSize(10);
  const periodText = `Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`;
  const generatedText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
  const userText = `Usuário: ${userEmail}`;
  
  pdf.text(periodText, margin + 40, 55);
  pdf.text(generatedText, margin + 40, 65);
  pdf.text(userText, pageWidth - margin - pdf.getTextWidth(userText), 55);

  currentY = 100;

  // ==================== CARDS DE MÉTRICAS PRINCIPAIS ====================
  const cardWidth = (contentWidth - 20) / 3;
  const cardHeight = 85;

  // Card Receitas
  drawCard(margin, currentY, cardWidth, cardHeight, 3);
  drawIcon(margin + 15, currentY + 15, 'income');
  
  pdf.setTextColor(...colors.gray[600]);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('RECEITAS TOTAIS', margin + 35, currentY + 22);
  
  pdf.setTextColor(...colors.success);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 15, currentY + 45);
  
  // Indicador de crescimento simulado
  pdf.setTextColor(...colors.success);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('↗ +12.5% vs mês anterior', margin + 15, currentY + 60);
  
  pdf.setTextColor(...colors.gray[500]);
  pdf.setFontSize(8);
  pdf.text('Entradas no período', margin + 15, currentY + 72);

  // Card Despesas
  const expenseX = margin + cardWidth + 10;
  drawCard(expenseX, currentY, cardWidth, cardHeight, 3);
  drawIcon(expenseX + 15, currentY + 15, 'expense');
  
  pdf.setTextColor(...colors.gray[600]);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('DESPESAS TOTAIS', expenseX + 35, currentY + 22);
  
  pdf.setTextColor(...colors.danger);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), expenseX + 15, currentY + 45);
  
  pdf.setTextColor(...colors.danger);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('↘ -5.2% vs mês anterior', expenseX + 15, currentY + 60);
  
  pdf.setTextColor(...colors.gray[500]);
  pdf.setFontSize(8);
  pdf.text('Saídas no período', expenseX + 15, currentY + 72);

  // Card Saldo
  const balanceX = margin + (cardWidth + 10) * 2;
  const balanceColor = data.balance >= 0 ? colors.success : colors.danger;
  
  drawCard(balanceX, currentY, cardWidth, cardHeight, 3);
  drawIcon(balanceX + 15, currentY + 15, 'balance');
  
  pdf.setTextColor(...colors.gray[600]);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SALDO LÍQUIDO', balanceX + 35, currentY + 22);
  
  pdf.setTextColor(...balanceColor);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.balance), balanceX + 15, currentY + 45);
  
  pdf.setTextColor(...balanceColor);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const balanceIndicator = data.balance >= 0 ? '↗ Resultado positivo' : '↘ Resultado negativo';
  pdf.text(balanceIndicator, balanceX + 15, currentY + 60);
  
  pdf.setTextColor(...colors.gray[500]);
  pdf.setFontSize(8);
  pdf.text('Diferença receitas - despesas', balanceX + 15, currentY + 72);

  currentY += 105;

  // ==================== GRÁFICO DE TENDÊNCIA MENSAL ====================
  drawCard(margin, currentY, contentWidth, 120, 2);
  
  pdf.setTextColor(...colors.gray[800]);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Evolução Financeira Mensal', margin + 20, currentY + 25);

  // Área do gráfico
  const chartX = margin + 30;
  const chartY = currentY + 40;
  const chartWidth = contentWidth - 60;
  const chartHeight = 60;

  // Fundo do gráfico
  pdf.setFillColor(...colors.gray[50]);
  pdf.rect(chartX, chartY, chartWidth, chartHeight, 'F');

  // Grid do gráfico
  pdf.setDrawColor(...colors.gray[200]);
  pdf.setLineWidth(0.3);
  for (let i = 0; i <= 4; i++) {
    const y = chartY + (chartHeight / 4) * i;
    pdf.line(chartX, y, chartX + chartWidth, y);
  }

  // Dados do gráfico
  const maxValue = Math.max(...data.monthlyTrend.map(d => Math.max(d.income, d.expense)));
  const barWidth = chartWidth / data.monthlyTrend.length / 3;

  data.monthlyTrend.forEach((month, index) => {
    const x = chartX + (chartWidth / data.monthlyTrend.length) * index;
    const incomeHeight = (month.income / maxValue) * chartHeight;
    const expenseHeight = (month.expense / maxValue) * chartHeight;

    // Barra de receitas
    pdf.setFillColor(...colors.success);
    pdf.rect(x + 5, chartY + chartHeight - incomeHeight, barWidth, incomeHeight, 'F');

    // Barra de despesas
    pdf.setFillColor(...colors.danger);
    pdf.rect(x + 5 + barWidth + 2, chartY + chartHeight - expenseHeight, barWidth, expenseHeight, 'F');

    // Label do mês
    pdf.setTextColor(...colors.gray[600]);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(month.month, x + 8, chartY + chartHeight + 8);
  });

  // Legenda
  pdf.setFillColor(...colors.success);
  pdf.rect(chartX + chartWidth - 80, chartY - 15, 8, 6, 'F');
  pdf.setTextColor(...colors.gray[700]);
  pdf.setFontSize(8);
  pdf.text('Receitas', chartX + chartWidth - 68, chartY - 11);

  pdf.setFillColor(...colors.danger);
  pdf.rect(chartX + chartWidth - 80, chartY - 5, 8, 6, 'F');
  pdf.text('Despesas', chartX + chartWidth - 68, chartY - 1);

  currentY += 140;

  // ==================== ANÁLISE POR CATEGORIA ====================
  drawCard(margin, currentY, contentWidth, 150, 2);
  
  pdf.setTextColor(...colors.gray[800]);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Análise por Categoria', margin + 20, currentY + 25);

  // Cabeçalho da tabela
  const tableY = currentY + 40;
  pdf.setFillColor(...colors.gray[100]);
  pdf.rect(margin + 20, tableY, contentWidth - 40, 15, 'F');
  
  pdf.setTextColor(...colors.gray[700]);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Categoria', margin + 30, tableY + 10);
  pdf.text('Receitas', margin + 100, tableY + 10);
  pdf.text('Despesas', margin + 140, tableY + 10);
  pdf.text('Saldo', margin + 180, tableY + 10);

  // Linhas da tabela
  let tableRowY = tableY + 20;
  data.transactionsByCategory.slice(0, 6).forEach((category, index) => {
    const balance = category.income - category.expense;
    const rowColor = index % 2 === 0 ? [255, 255, 255] : colors.gray[50];
    
    pdf.setFillColor(...rowColor);
    pdf.rect(margin + 20, tableRowY, contentWidth - 40, 15, 'F');
    
    // Indicador de cor da categoria
    const categoryColorRGB = [
      parseInt(category.color.slice(1, 3), 16),
      parseInt(category.color.slice(3, 5), 16),
      parseInt(category.color.slice(5, 7), 16)
    ];
    pdf.setFillColor(...categoryColorRGB);
    pdf.circle(margin + 25, tableRowY + 7.5, 3, 'F');
    
    // Dados da categoria
    pdf.setTextColor(...colors.gray[800]);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(category.name, margin + 32, tableRowY + 10);
    
    pdf.setTextColor(...colors.success);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.income), margin + 100, tableRowY + 10);
    
    pdf.setTextColor(...colors.danger);
    pdf.text(formatCurrency(category.expense), margin + 140, tableRowY + 10);
    
    pdf.setTextColor(balance >= 0 ? ...colors.success : ...colors.danger);
    pdf.text(formatCurrency(balance), margin + 180, tableRowY + 10);
    
    tableRowY += 15;
  });

  currentY += 170;

  // ==================== TOP CATEGORIAS DE DESPESA ====================
  if (data.topExpenseCategories.length > 0) {
    drawCard(margin, currentY, contentWidth, 120, 2);
    
    pdf.setTextColor(...colors.gray[800]);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Principais Categorias de Despesa', margin + 20, currentY + 25);

    let rankingY = currentY + 40;
    data.topExpenseCategories.slice(0, 4).forEach((category, index) => {
      // Ranking badge
      pdf.setFillColor(...colors.primary);
      pdf.circle(margin + 30, rankingY + 7, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 27, rankingY + 10);
      
      // Nome da categoria
      pdf.setTextColor(...colors.gray[800]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 45, rankingY + 8);
      
      // Percentual
      pdf.setTextColor(...colors.gray[600]);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total`, margin + 45, rankingY + 16);
      
      // Valor
      pdf.setTextColor(...colors.danger);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 30, rankingY + 10);
      
      // Barra de progresso
      const progressWidth = 60;
      const progressHeight = 4;
      const progressX = pageWidth - margin - progressWidth - 30;
      const progressY = rankingY + 15;
      
      pdf.setFillColor(...colors.gray[200]);
      pdf.rect(progressX, progressY, progressWidth, progressHeight, 'F');
      
      pdf.setFillColor(...colors.danger);
      const fillWidth = (category.percentage / 100) * progressWidth;
      pdf.rect(progressX, progressY, fillWidth, progressHeight, 'F');
      
      rankingY += 20;
    });

    currentY += 140;
  }

  // ==================== RODAPÉ PROFISSIONAL ====================
  const footerY = pageHeight - 30;
  pdf.setFillColor(...colors.gray[100]);
  pdf.rect(0, footerY, pageWidth, 30, 'F');
  
  // Logo pequeno no rodapé
  pdf.setFillColor(...colors.primary);
  pdf.circle(margin + 8, footerY + 15, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SF', margin + 5, footerY + 18);
  
  // Informações do rodapé
  pdf.setTextColor(...colors.gray[600]);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Financeiro Profissional', margin + 20, footerY + 12);
  pdf.text('contato@sistemafinanceiro.com.br', margin + 20, footerY + 22);
  
  // Página
  pdf.text('Página 1', pageWidth - margin - 20, footerY + 17);

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

  const drawCard = (x: number, y: number, width: number, height: number, elevation = 2) => {
    // Sombra para elevação
    for (let i = 0; i < elevation; i++) {
      pdf.setFillColor(0, 0, 0, 0.05);
      pdf.roundedRect(x + i, y + i, width, height, 8, 8, 'F');
    }
    
    // Card principal
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 8, 8, 'F');
    
    // Borda sutil
    pdf.setDrawColor(...colors.gray[200]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, width, height, 8, 8, 'S');
  };

  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 50) {
      pdf.addPage();
      return 30;
    }
    return currentY;
  };

  const addHeader = () => {
    // Cabeçalho moderno
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 60, 'F');
    
    // Logo
    pdf.setFillColor(255, 255, 255);
    pdf.circle(margin + 12, 20, 12, 'F');
    pdf.setTextColor(...colors.primary);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SF', margin + 6, 25);

    // Título
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RELATÓRIO DETALHADO', margin + 35, 25);
    
    // Informações
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin + 35, 38);
    pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin + 35, 48);
    pdf.text(`Usuário: ${userEmail}`, pageWidth - margin - pdf.getTextWidth(`Usuário: ${userEmail}`), 38);
  };

  let currentY = 0;
  addHeader();
  currentY = 80;

  // ==================== ÍNDICE NAVEGÁVEL ====================
  drawCard(margin, currentY, contentWidth, 80, 2);
  
  pdf.setTextColor(...colors.gray[800]);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Índice do Relatório', margin + 20, currentY + 25);

  const indexItems = [
    'Resumo Executivo ......................................................... Página 1',
    'Análise por Categoria .................................................. Página 1',
    'Detalhamento de Transações ...................................... Página 2',
    'Gráficos e Tendências ................................................. Página 1'
  ];

  let indexY = currentY + 40;
  indexItems.forEach(item => {
    pdf.setTextColor(...colors.gray[600]);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item, margin + 30, indexY);
    indexY += 10;
  });

  currentY += 100;

  // ==================== RESUMO EXECUTIVO ====================
  drawCard(margin, currentY, contentWidth, 100, 2);
  
  pdf.setTextColor(...colors.gray[800]);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Executivo', margin + 20, currentY + 25);

  // Grid de métricas
  const metricsY = currentY + 45;
  const metricWidth = (contentWidth - 80) / 3;

  // Receitas
  pdf.setFillColor(...colors.success);
  pdf.circle(margin + 30, metricsY + 8, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('↑', margin + 27, metricsY + 11);
  
  pdf.setTextColor(...colors.gray[700]);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Receitas:', margin + 45, metricsY + 8);
  pdf.setTextColor(...colors.success);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalIncome), margin + 45, metricsY + 20);

  // Despesas
  pdf.setFillColor(...colors.danger);
  pdf.circle(margin + 30, metricsY + 35, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('↓', margin + 27, metricsY + 38);
  
  pdf.setTextColor(...colors.gray[700]);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Despesas:', margin + 45, metricsY + 35);
  pdf.setTextColor(...colors.danger);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(data.totalExpenses), margin + 45, metricsY + 47);

  // Estatísticas adicionais
  pdf.setTextColor(...colors.gray[600]);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total de Transações: ${transactions.length}`, margin + 120, metricsY + 15);
  pdf.text(`Saldo Líquido: ${formatCurrency(data.balance)}`, margin + 120, metricsY + 27);
  pdf.text(`Categorias Ativas: ${data.transactionsByCategory.length}`, margin + 120, metricsY + 39);

  currentY += 120;

  // ==================== DETALHAMENTO DE TRANSAÇÕES ====================
  currentY = checkPageBreak(currentY, 100);
  
  drawCard(margin, currentY, contentWidth, 40, 2);
  pdf.setTextColor(...colors.gray[800]);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalhamento Completo de Transações', margin + 20, currentY + 25);

  currentY += 60;

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
    
    currentY = checkPageBreak(currentY, 100);
    
    // Header da data
    drawCard(margin, currentY, contentWidth, 30, 1);
    pdf.setFillColor(...colors.primary);
    pdf.roundedRect(margin + 5, currentY + 5, contentWidth - 10, 20, 5, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 15, currentY + 18);
    
    // Resumo do dia
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    pdf.setFontSize(10);
    const summary = `${dayTransactions.length} transações • Saldo: ${formatCurrency(dayBalance)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 15, currentY + 18);
    
    currentY += 40;
    
    // Transações do dia
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 30);
      
      // Card da transação
      drawCard(margin, currentY, contentWidth, 25, 1);
      
      // Indicador de tipo
      const typeColor = transaction.type === 'income' ? colors.success : colors.danger;
      pdf.setFillColor(...typeColor);
      pdf.roundedRect(margin + 8, currentY + 8, 6, 10, 3, 3, 'F');
      
      // Ícone do tipo
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.type === 'income' ? '↑' : '↓', margin + 9, currentY + 15);
      
      // Descrição
      pdf.setTextColor(...colors.gray[800]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.description, margin + 25, currentY + 12);
      
      // Categoria e conta
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.gray[600]);
      pdf.text(`${transaction.category} • ${transaction.account}`, margin + 25, currentY + 20);
      
      // Valor
      pdf.setTextColor(...typeColor);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 15, currentY + 15);
      
      currentY += 30;
    });
    
    currentY += 10;
  });

  // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 25;
    
    pdf.setFillColor(...colors.gray[100]);
    pdf.rect(0, footerY, pageWidth, 25, 'F');
    
    // Logo pequeno
    pdf.setFillColor(...colors.primary);
    pdf.circle(margin + 8, footerY + 12, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SF', margin + 5, footerY + 15);
    
    // Informações
    pdf.setTextColor(...colors.gray[600]);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema Financeiro Profissional - Relatório Detalhado', margin + 20, footerY + 10);
    pdf.text('contato@sistemafinanceiro.com.br | (11) 9999-9999', margin + 20, footerY + 18);
    
    // Numeração
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 30, footerY + 14);
  }

  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};