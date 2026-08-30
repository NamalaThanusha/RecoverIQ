import { PrismaClient, PaymentStatus } from '@prisma/client';
import { CalculateRecoveryContextInput, CalculateRecoveryContextOutput } from './types';
import { getPaymentDetails } from './getPaymentDetails';
import { getCustomerHistory } from './getCustomerHistory';

export async function calculateRecoveryContext(
  prisma: PrismaClient,
  input: CalculateRecoveryContextInput
): Promise<CalculateRecoveryContextOutput> {
  const payment = await getPaymentDetails(prisma, { paymentId: input.paymentId });
  const history = await getCustomerHistory(prisma, { customerId: payment.customerId });

  // Get active merchant policy for thresholds
  const policy = await prisma.merchantPolicy.findFirst({
    where: { active: true }
  });

  const highValueThreshold = policy?.highValueThreshold ?? 100.0;
  const maxRetryCount = policy?.maxRetryAttempts ?? 3;

  const isHighValue = history.metrics.totalHistoricalValue >= highValueThreshold;
  const isRetryable = payment.status === PaymentStatus.FAILED && payment.retryCount < maxRetryCount;
  
  const recoveryAttemptedPreviously = payment.retryCount > 0;

  return {
    paymentAmount: payment.amount,
    customerLTV: history.metrics.totalHistoricalValue,
    successRate: history.metrics.successRate,
    previousFailureCount: history.metrics.failedPayments,
    retryCount: payment.retryCount,
    isRetryable,
    isHighValue,
    recoveryAttemptedPreviously,
  };
}
