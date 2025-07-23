import { supabase } from '../lib/supabase';
import { addMonths, addWeeks, format, isBefore, isAfter, startOfDay, addDays } from 'date-fns';

interface RecurringPayment {
  id: string;
  user_id: string;
  patient_id: string;
  amount: number;
  payment_method: string;
  description?: string;
  is_recurring: boolean;
  recurring_frequency: 'weekly' | 'monthly';
  recurring_until?: string;
  recurring_day: number;
  payment_date: string;
}

export class RecurringPaymentGenerator {
  static async generateRecurringPayments(userId: string) {
    try {
      console.log('Generating recurring payments for user:', userId);
      
      // Buscar todos os pagamentos recorrentes ativos do usuário
      const { data: recurringPayments, error } = await supabase
        .from('patient_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_recurring', true)
        .is('parent_payment_id', null) // Apenas pagamentos principais, não os gerados
        .limit(50); // Limitar para evitar problemas de performance

      if (error) {
        console.error('Error fetching recurring payments:', error);
        return;
      }

      if (!recurringPayments || recurringPayments.length === 0) {
        return;
      }

      const today = startOfDay(new Date());
      const futureLimit = addMonths(today, 6); // Gerar até 6 meses no futuro
      const paymentsToCreate = [];

      for (const payment of recurringPayments) {
        console.log(`Processing recurring payment: ${payment.id}`);
        const nextPayments = await this.calculateNextPayments(payment, today, futureLimit);
        paymentsToCreate.push(...nextPayments);
      }

      // Criar os pagamentos em lote
      if (paymentsToCreate.length > 0) {
        console.log(`Creating ${paymentsToCreate.length} recurring payments`);
        const { error: insertError } = await supabase
          .from('patient_payments')
          .insert(paymentsToCreate);

        if (insertError) {
          console.error('Error creating recurring payments:', insertError);
        } else {
          console.log(`Successfully created ${paymentsToCreate.length} recurring payments`);
        }
      } else {
        console.log('No recurring payments to create');
      }
    } catch (error) {
      console.error('Error in generateRecurringPayments:', error);
    }
  }

  private static async calculateNextPayments(payment: RecurringPayment, today: Date, futureLimit: Date) {
    const paymentsToCreate = [];
    const lastPaymentDate = new Date(payment.payment_date);
    const recurringUntil = payment.recurring_until ? new Date(payment.recurring_until) : null;

    // Começar a partir da próxima data de pagamento
    let nextDate = this.getNextPaymentDate(lastPaymentDate, payment.recurring_frequency, payment.recurring_day);
    
    // Determinar data limite
    const endDate = recurringUntil && isBefore(recurringUntil, futureLimit) ? recurringUntil : futureLimit;

    let iterationCount = 0;
    const maxIterations = 24; // Máximo 24 pagamentos futuros (2 anos)

    while ((isBefore(nextDate, endDate) || nextDate.getTime() === endDate.getTime()) && iterationCount < maxIterations) {
      iterationCount++;
      
      // Verificar se já existe um pagamento para esta data
      const existingPayment = await this.checkExistingPayment(payment, nextDate);
      
      if (!existingPayment) {
        paymentsToCreate.push({
          user_id: payment.user_id,
          patient_id: payment.patient_id,
          amount: payment.amount,
          payment_date: format(nextDate, 'yyyy-MM-dd'),
          payment_method: payment.payment_method,
          description: payment.description,
          status: 'pending',
          is_recurring: false,
          parent_payment_id: payment.id,
        });
      }

      // Calcular próxima data
      nextDate = this.getNextPaymentDate(nextDate, payment.recurring_frequency, payment.recurring_day);
    }

    console.log(`Generated ${paymentsToCreate.length} payments for recurring payment ${payment.id}`);
    return paymentsToCreate;
  }

  private static getNextPaymentDate(currentDate: Date, frequency: 'weekly' | 'monthly', recurringDay: number): Date {
    if (frequency === 'weekly') {
      return addDays(currentDate, 7);
    } else {
      // Para frequência mensal
      let nextMonth = addMonths(currentDate, 1);
      const year = nextMonth.getFullYear();
      const month = nextMonth.getMonth();
      
      // Usar o dia específico ou último dia do mês se não existir
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(recurringDay, daysInMonth);
      
      return new Date(year, month, day);
    }
  }

  private static async checkExistingPayment(payment: RecurringPayment, date: Date): Promise<boolean> {
    const { data, error } = await supabase
      .from('patient_payments')
      .select('id')
      .eq('user_id', payment.user_id)
      .eq('patient_id', payment.patient_id)
      .eq('payment_date', format(date, 'yyyy-MM-dd'))
      .limit(1);

    if (error) {
      console.error('Error checking existing payment:', error);
      return false;
    }

    return data && data.length > 0;
  }

  // Método para forçar geração de pagamentos recorrentes
  static async forceGenerateRecurringPayments(userId: string) {
    await this.generateRecurringPayments(userId);
  }

  // Método para inicializar pagamentos recorrentes
  static async initializeRecurringPayments(userId: string) {
    // Sempre executar para garantir que pagamentos futuros sejam criados
    await this.generateRecurringPayments(userId);
  }
}