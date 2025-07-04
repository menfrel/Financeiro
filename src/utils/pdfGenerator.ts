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

// Paleta de cores moderna e elegante
const colors = {
  primary: [79, 70, 229],       // indigo-600
  secondary: [99, 102, 241],    // indigo-500
  success: [16, 185, 129],      // emerald-500
  danger: [239, 68, 68],        // red-500
  warning: [245, 158, 11],      // amber-500
  info: [59, 130, 246],         // blue-500
  dark: [17, 24, 39],           // gray-900
  medium: [75, 85, 99],         // gray-600
  light: [156, 163, 175],       // gray-400
  lighter: [229, 231, 235],     // gray-200
  lightest: [249, 250, 251],    // gray-50
  white: [255, 255, 255],
  accent1: [139, 92, 246],      // violet-500
  accent2: [236, 72, 153],      // pink-500
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

  // Função para criar gradiente suave
  const addSoftGradient = (x: number, y: number, width: number, height: number, color1: number[], color2: number[]) => {
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
      const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
      const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
      
      pdf.setFillColor(r, g, b);
      pdf.rect(x, y + (height * ratio), width, height / steps, 'F');
    }
  };

  // Card moderno sem círculos
  const addModernCard = (x: number, y: number, width: number, height: number, title: string, value: string, subtitle: string, color: number[], trend?: string) => {
    // Sombra sutil
    pdf.setFillColor(0, 0, 0, 0.05);
    pdf.roundedRect(x + 2, y + 2, width, height, 12, 12, 'F');
    
    // Background do card
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(x, y, width, height, 12, 12, 'F');
    
    // Borda sutil
    pdf.setDrawColor(...colors.lighter);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, width, height, 12, 12, 'S');
    
    // Barra de destaque no topo
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, width, 6, 12, 12, 'F');
    pdf.rect(x, y + 3, width, 3, 'F');
    
    // Ícone geométrico moderno (retângulo com gradiente)
    if (trend) {
      const iconX = x + width - 35;
      const iconY = y + 15;
      
      // Background do ícone
      pdf.setFillColor(color[0], color[1], color[2], 0.1);
      pdf.roundedRect(iconX, iconY, 25, 20, 6, 6, 'F');
      
      // Elemento gráfico moderno
      pdf.setFillColor(...color);
      if (trend === 'up') {
        // Seta para cima estilizada
        pdf.rect(iconX + 11, iconY + 5, 3, 10, 'F');
        pdf.rect(iconX + 8, iconY + 8, 9, 2, 'F');
      } else if (trend === 'down') {
        // Seta para baixo estilizada
        pdf.rect(iconX + 11, iconY + 5, 3, 10, 'F');
        pdf.rect(iconX + 8, iconY + 10, 9, 2, 'F');
      } else {
        // Elemento neutro
        pdf.rect(iconX + 8, iconY + 8, 9, 4, 'F');
      }
    }
    
    // Título
    pdf.setTextColor(...colors.medium);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title, x + 15, y + 25);
    
    // Valor principal
    pdf.setTextColor(...color);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, x + 15, y + 45);
    
    // Subtítulo
    pdf.setTextColor(...colors.light);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, x + 15, y + 55);
  };

  // Header com design minimalista
  const addMinimalistHeader = (title: string, subtitle: string) => {
    // Background elegante
    addSoftGradient(0, 0, pageWidth, 100, colors.primary, colors.secondary);
    
    // Elementos decorativos geométricos
    pdf.setFillColor(255, 255, 255, 0.1);
    pdf.rect(pageWidth - 80, 10, 60, 4, 'F');
    pdf.rect(pageWidth - 60, 20, 40, 4, 'F');
    pdf.rect(pageWidth - 40, 30, 20, 4, 'F');
    
    // Título principal
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, 35);
    
    // Linha decorativa
    pdf.setFillColor(...colors.white);
    pdf.rect(margin, 45, 120, 2, 'F');
    
    // Subtítulo
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, margin, 60);
    
    // Informações do relatório
    pdf.setFontSize(11);
    pdf.text(`Período: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 75);
    pdf.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} para ${userEmail}`, margin, 87);
  };

  // Seção com título elegante
  const addSectionTitle = (x: number, y: number, title: string, subtitle: string) => {
    // Background da seção
    pdf.setFillColor(...colors.lightest);
    pdf.roundedRect(x, y, contentWidth, 30, 8, 8, 'F');
    
    // Linha de destaque
    pdf.setFillColor(...colors.primary);
    pdf.rect(x + 15, y + 10, 4, 10, 'F');
    
    // Título
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, x + 25, y + 15);
    
    // Subtítulo
    pdf.setTextColor(...colors.medium);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, x + 25, y + 23);
  };

  let currentY = 0;

  // Header principal
  addMinimalistHeader('RELATÓRIO FINANCEIRO', 'Análise Completa do Período');
  currentY = 120;

  // Seção de KPIs
  addSectionTitle(margin, currentY, 'INDICADORES PRINCIPAIS', 'Resumo executivo dos resultados');
  currentY += 45;

  // Cards de KPI modernos
  const cardWidth = (contentWidth - 20) / 3;
  
  addModernCard(
    margin, currentY, cardWidth, 70,
    'RECEITAS TOTAIS',
    formatCurrency(data.totalIncome),
    'Entradas no período',
    colors.success,
    'up'
  );
  
  addModernCard(
    margin + cardWidth + 10, currentY, cardWidth, 70,
    'DESPESAS TOTAIS', 
    formatCurrency(data.totalExpenses),
    'Saídas no período',
    colors.danger,
    'down'
  );
  
  addModernCard(
    margin + (cardWidth + 10) * 2, currentY, cardWidth, 70,
    'SALDO LÍQUIDO',
    formatCurrency(data.balance),
    data.balance >= 0 ? 'Resultado positivo' : 'Resultado negativo',
    data.balance >= 0 ? colors.success : colors.danger,
    data.balance >= 0 ? 'up' : 'down'
  );

  currentY += 90;

  // Seção de categorias
  addSectionTitle(margin, currentY, 'ANÁLISE POR CATEGORIA', 'Distribuição detalhada de receitas e despesas');
  currentY += 45;

  // Lista de categorias com design moderno
  data.transactionsByCategory.slice(0, 8).forEach((category, index) => {
    const balance = category.income - category.expense;
    const cardY = currentY + (index * 40);
    
    // Card da categoria
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(margin, cardY, contentWidth, 35, 8, 8, 'F');
    
    // Sombra sutil
    pdf.setFillColor(0, 0, 0, 0.03);
    pdf.roundedRect(margin + 1, cardY + 1, contentWidth, 35, 8, 8, 'F');
    
    // Indicador de cor da categoria (retângulo moderno)
    const hexColor = category.color;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(margin + 10, cardY + 8, 6, 19, 3, 3, 'F');
    
    // Nome da categoria
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(category.name, margin + 25, cardY + 15);
    
    // Métricas organizadas
    pdf.setTextColor(...colors.medium);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    // Receitas
    pdf.text('Receitas:', margin + 25, cardY + 25);
    pdf.setTextColor(...colors.success);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.income), margin + 55, cardY + 25);
    
    // Despesas
    pdf.setTextColor(...colors.medium);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Despesas:', margin + 120, cardY + 25);
    pdf.setTextColor(...colors.danger);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(category.expense), margin + 155, cardY + 25);
    
    // Saldo
    pdf.setTextColor(...(balance >= 0 ? colors.success : colors.danger));
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const balanceText = formatCurrency(balance);
    const balanceWidth = pdf.getTextWidth(balanceText);
    pdf.text(balanceText, pageWidth - margin - balanceWidth - 15, cardY + 20);
  });

  currentY += (Math.min(data.transactionsByCategory.length, 8) * 40) + 30;

  // Top categorias de despesa
  if (data.topExpenseCategories.length > 0) {
    addSectionTitle(margin, currentY, 'PRINCIPAIS DESPESAS', 'Categorias com maiores gastos');
    currentY += 45;

    data.topExpenseCategories.slice(0, 5).forEach((category, index) => {
      const cardY = currentY + (index * 45);
      
      // Card da categoria
      pdf.setFillColor(...colors.lightest);
      pdf.roundedRect(margin, cardY, contentWidth, 40, 10, 10, 'F');
      
      // Número do ranking (design moderno)
      pdf.setFillColor(...colors.primary);
      pdf.roundedRect(margin + 15, cardY + 10, 25, 20, 6, 6, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text((index + 1).toString(), margin + 25, cardY + 23);
      
      // Informações da categoria
      pdf.setTextColor(...colors.dark);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category.name, margin + 50, cardY + 18);
      
      pdf.setTextColor(...colors.medium);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.percentage.toFixed(1)}% do total de despesas`, margin + 50, cardY + 28);
      
      // Valor
      pdf.setTextColor(...colors.danger);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const amountText = formatCurrency(category.amount);
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margin - amountWidth - 15, cardY + 23);
    });
  }

  // Footer elegante
  const footerY = pageHeight - 30;
  pdf.setFillColor(...colors.lightest);
  pdf.rect(0, footerY, pageWidth, 30, 'F');
  
  // Linha decorativa
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, footerY, pageWidth, 2, 'F');
  
  pdf.setTextColor(...colors.medium);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gerenciamento Financeiro', margin, footerY + 15);
  pdf.text('Relatório gerado automaticamente', margin, footerY + 23);
  pdf.text('Página 1', pageWidth - margin - 20, footerY + 19);

  // Salvar com nome moderno
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

  const addSoftGradient = (x: number, y: number, width: number, height: number, color1: number[], color2: number[]) => {
    const steps = 25;
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
    const cardHeight = 30;
    const typeColor = transaction.type === 'income' ? colors.success : colors.danger;
    
    // Background do card
    pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    pdf.roundedRect(x, y, contentWidth, cardHeight, 6, 6, 'F');
    
    // Indicador de tipo (barra lateral)
    pdf.setFillColor(...typeColor);
    pdf.roundedRect(x + 8, y + 6, 4, 18, 2, 2, 'F');
    
    // Ícone de tipo moderno (retângulo com seta)
    pdf.setFillColor(typeColor[0], typeColor[1], typeColor[2], 0.1);
    pdf.roundedRect(x + 20, y + 8, 20, 14, 4, 4, 'F');
    
    pdf.setTextColor(...typeColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(transaction.type === 'income' ? '↗' : '↘', x + 28, y + 18);
    
    // Descrição
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(transaction.description, x + 50, y + 15);
    
    // Categoria e conta
    pdf.setTextColor(...colors.medium);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${transaction.category} • ${transaction.account}`, x + 50, y + 23);
    
    // Valor
    pdf.setTextColor(...typeColor);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`;
    const amountWidth = pdf.getTextWidth(amountText);
    pdf.text(amountText, pageWidth - margin - amountWidth - 10, y + 18);
  };

  const checkPageBreak = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 50) {
      pdf.addPage();
      return 30;
    }
    return currentY;
  };

  let currentY = 0;

  // Header ultra-moderno
  addSoftGradient(0, 0, pageWidth, 110, colors.primary, colors.accent1);
  
  // Elementos decorativos geométricos
  pdf.setFillColor(255, 255, 255, 0.08);
  pdf.rect(pageWidth - 100, 15, 80, 6, 'F');
  pdf.rect(pageWidth - 80, 30, 60, 6, 'F');
  pdf.rect(pageWidth - 60, 45, 40, 6, 'F');
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO', margin, 35);
  pdf.text('DETALHADO', margin, 60);
  
  // Linha decorativa moderna
  pdf.setFillColor(...colors.white);
  pdf.rect(margin, 70, 100, 3, 'F');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, 85);
  pdf.text(`${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} | ${userEmail}`, margin, 97);

  currentY = 130;

  // Card de resumo executivo
  pdf.setFillColor(...colors.white);
  pdf.roundedRect(margin, currentY, contentWidth, 60, 12, 12, 'F');
  
  // Sombra
  pdf.setFillColor(0, 0, 0, 0.05);
  pdf.roundedRect(margin + 2, currentY + 2, contentWidth, 60, 12, 12, 'F');

  // Título do resumo
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO EXECUTIVO', margin + 20, currentY + 20);

  // Métricas em grid
  const metrics = [
    { label: 'Receitas', value: formatCurrency(data.totalIncome), color: colors.success },
    { label: 'Despesas', value: formatCurrency(data.totalExpenses), color: colors.danger },
    { label: 'Saldo', value: formatCurrency(data.balance), color: data.balance >= 0 ? colors.success : colors.danger },
    { label: 'Transações', value: transactions.length.toString(), color: colors.info }
  ];

  metrics.forEach((metric, index) => {
    const x = margin + 20 + (index * (contentWidth / 4));
    pdf.setTextColor(...colors.medium);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.label, x, currentY + 35);
    
    pdf.setTextColor(...metric.color);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, x, currentY + 45);
  });

  currentY += 80;

  // Transações por data
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
    addSoftGradient(margin, currentY, contentWidth, 35, colors.info, colors.secondary);
    
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const formattedDate = format(new Date(date), 'dd/MM/yyyy - EEEE', { locale: ptBR });
    pdf.text(formattedDate, margin + 15, currentY + 15);
    
    // Resumo do dia
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const summary = `${dayTransactions.length} transações • Saldo: ${formatCurrency(dayIncome - dayExpense)}`;
    const summaryWidth = pdf.getTextWidth(summary);
    pdf.text(summary, pageWidth - margin - summaryWidth - 15, currentY + 25);
    
    currentY += 40;
    
    // Cards das transações
    dayTransactions.forEach((transaction, index) => {
      currentY = checkPageBreak(currentY, 35);
      addTransactionCard(margin, currentY, transaction, index % 2 === 0);
      currentY += 35;
    });
    
    currentY += 15;
  });

  // Footer moderno em todas as páginas
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 25;
    
    pdf.setFillColor(...colors.lightest);
    pdf.rect(0, footerY, pageWidth, 25, 'F');
    
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, footerY, pageWidth, 2, 'F');
    
    pdf.setTextColor(...colors.medium);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sistema de Gerenciamento Financeiro - Relatório Detalhado', margin, footerY + 15);
    pdf.text(`${i} de ${totalPages}`, pageWidth - margin - 25, footerY + 15);
  }

  const fileName = `relatorio-detalhado-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};