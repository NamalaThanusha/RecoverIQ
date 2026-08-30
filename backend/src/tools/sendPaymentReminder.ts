import { PrismaClient } from '@prisma/client';
import { SendPaymentReminderInput, SendPaymentReminderOutput } from './types';
import { ToolError, ToolErrorCodes } from './errors';
import * as crypto from 'crypto';

export async function sendPaymentReminder(
  prisma: PrismaClient,
  input: SendPaymentReminderInput
): Promise<SendPaymentReminderOutput> {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId }
  });

  if (!payment) {
    throw new ToolError(
      ToolErrorCodes.PAYMENT_NOT_FOUND,
      `Payment with ID ${input.paymentId} not found`
    );
  }

  const reminderId = `rem_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  await prisma.auditLog.create({
    data: {
      paymentId: input.paymentId,
      eventType: 'PAYMENT_REMINDER_SENT',
      message: `Simulated payment reminder sent for payment ${input.paymentId} using template ${input.templateId}`,
      metadata: {
        templateId: input.templateId,
        reminderId,
        channel: 'email'
      }
    }
  });

  return {
    reminderId,
    paymentId: input.paymentId,
    channel: 'email',
    status: 'sent',
    timestamp: new Date()
  };
}
