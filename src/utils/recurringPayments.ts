import { supabase } from '../lib/supabase';
import { addMonths, addWeeks, format, isBefore, isAfter, startOfDay } from 'date-fns';

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
      // Buscar todos os pagamentos recorrentes ativos do usuário
      const { data: recurringPayments, error } = await supabase
        .from('patient_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_recurring', true)
        .is('parent_payment_id', null); // Apenas pagamentos principais, não os gerados

      if (error) {
        console.error('Error fetching recurring payments:', error);
        return;
      }

      if (!recurringPayments || recurringPayments.length === 0) {
        return;
      }

      const today = startOfDay(new Date());
      const paymentsToCreate = [];

      for (const payment of recurringPayments) {
        const nextPayments = this.calculateNextPayments(payment, today);
        paymentsToCreate.push(...nextPayments);
      }

      // Criar os pagamentos em lote
      if (paymentsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('patient_payments')
          .insert(paymentsToCreate);

        if (insertError) {
          console.error('Error creating recurring payments:', insertError);
        } else {
          console.log(`Created ${paymentsToCreate.length} recurring payments`);
        }
      }
    } catch (error) {
      console.error('Error in generateRecurringPayments:', error);
    }
  }

  private static calculateNextPayments(payment: RecurringPayment, today: Date) {
    const paymentsToCreate = [];
    const lastPaymentDate = new Date(payment.payment_date);
    const recurringUntil = payment.recurring_until ? new Date(payment.recurring_until) : null;

    // Calcular próximas datas baseado na frequência
    let nextDate = this.getNextPaymentDate(lastPaymentDate, payment.recurring_frequency, payment.recurring_day);
    
    // Gerar pagamentos até 3 meses no futuro ou até a data limite
    const maxDate = addMonths(today, 3);
    const endDate = recurringUntil && isBefore(recurringUntil, maxDate) ? recurringUntil : maxDate;

    while (isBefore(nextDate, endDate) || nextDate.getTime() === endDate.getTime()) {
      // Verificar se já existe um pagamento para esta data
      const existingPayment = this.checkExistingPayment(payment, nextDate);
      
      if (!existingPayment) {
        paymentsToCreate.push({
          user_id: payment.user_id,
          patient_id: payment.patient_id,
          amount: payment.amount,
          payment_date: format(nextDate, 'yyyy-MM-dd'),
          payment_method: payment.payment_method,
          description: payment.description,
          status: 'pending',
          is_recurring: false, // Pagamentos gerados não são recorrentes
          parent_payment_id: payment.id,
        });
      }

      // Calcular próxima data
      nextDate = this.getNextPaymentDate(nextDate, payment.recurring_frequency, payment.recurring_day);
    }

    return paymentsToCreate;
  }

  private static getNextPaymentDate(currentDate: Date, frequency: 'weekly' | 'monthly', recurringDay: number): Date {
    if (frequency === 'weekly') {
      return addWeeks(currentDate, 1);
    } else {
      // Para mensal, usar o dia específico
      const nextMonth = addMonths(currentDate, 1);
      const year = nextMonth.getFullYear();
      const month = nextMonth.getMonth();
      
      // Ajustar para o último dia do mês se o dia não existir
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

  // Método para ser chamado quando o usuário faz login ou acessa a página
  static async initializeRecurringPayments(userId: string) {
    // Executar apenas uma vez por dia por usuário
    const lastRun = localStorage.getItem(`lastRecurringRun_${userId}`);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (lastRun !== today) {
      await this.generateRecurringPayments(userId);
      localStorage.setItem(`lastRecurringRun_${userId}`, today);
    }
  }
}