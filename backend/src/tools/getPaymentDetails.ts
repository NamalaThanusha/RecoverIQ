import { PrismaClient } from '@prisma/client';
import { GetPaymentDetailsInput, GetPaymentDetailsOutput } from './types';
import { ToolError, ToolErrorCodes } from './errors';

export async function getPaymentDetails(
  prisma: PrismaClient,
  input: GetPaymentDetailsInput
): Promise<GetPaymentDetailsOutput> {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
  });

  if (!payment) {
    throw new ToolError(
      ToolErrorCodes.PAYMENT_NOT_FOUND,
      `Payment with ID ${input.paymentId} not found`
    );
  }

  return {
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    failureReason: payment.failureReason,
    retryCount: payment.retryCount,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    customerId: payment.customerId,
  };
}
