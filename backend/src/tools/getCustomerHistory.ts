import { PrismaClient, PaymentStatus } from '@prisma/client';
import { GetCustomerHistoryInput, GetCustomerHistoryOutput } from './types';
import { ToolError, ToolErrorCodes } from './errors';

export async function getCustomerHistory(
  prisma: PrismaClient,
  input: GetCustomerHistoryInput
): Promise<GetCustomerHistoryOutput> {
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      }
    }
  });

  if (!customer) {
    throw new ToolError(
      ToolErrorCodes.CUSTOMER_NOT_FOUND,
      `Customer with ID ${input.customerId} not found`
    );
  }

  const aggregates = await prisma.payment.groupBy({
    by: ['status'],
    where: { customerId: input.customerId },
    _count: {
      _all: true
    },
    _sum: {
      amount: true
    }
  });

  let totalPayments = 0;
  let successfulPayments = 0;
  let failedPayments = 0;
  let pendingPayments = 0;
  let totalHistoricalValue = 0;
  let successfulValue = 0;

  for (const agg of aggregates) {
    totalPayments += agg._count._all;
    totalHistoricalValue += (agg._sum.amount || 0);

    if (agg.status === PaymentStatus.SUCCESS) {
      successfulPayments += agg._count._all;
      successfulValue += (agg._sum.amount || 0);
    } else if (agg.status === PaymentStatus.FAILED) {
      failedPayments += agg._count._all;
    } else if (agg.status === PaymentStatus.PENDING || agg.status === PaymentStatus.REQUIRES_ACTION) {
      pendingPayments += agg._count._all;
    }
  }

  const successRate = totalPayments > 0 ? successfulPayments / totalPayments : 0;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      segment: customer.segment,
    },
    metrics: {
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalHistoricalValue,
      successfulValue,
      successRate,
    },
    recentPayments: customer.payments.map(p => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
    })),
  };
}
