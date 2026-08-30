import { PrismaClient, ApprovalStatus } from '@prisma/client';
import { EscalateCaseInput, EscalateCaseOutput } from './types';
import { ToolError, ToolErrorCodes } from './errors';

export async function escalateCase(
  prisma: PrismaClient,
  input: EscalateCaseInput
): Promise<EscalateCaseOutput> {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId }
  });

  if (!payment) {
    throw new ToolError(
      ToolErrorCodes.PAYMENT_NOT_FOUND,
      `Payment with ID ${input.paymentId} not found`
    );
  }

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      paymentId: input.paymentId,
      proposedAction: 'ESCALATION',
      reason: input.reason,
      status: ApprovalStatus.PENDING,
    }
  });

  await prisma.auditLog.create({
    data: {
      paymentId: input.paymentId,
      eventType: 'CASE_ESCALATED',
      message: `Case escalated for payment ${input.paymentId}`,
      metadata: {
        reason: input.reason,
        approvalRequestId: approvalRequest.id
      }
    }
  });

  return {
    approvalRequestId: approvalRequest.id,
    paymentId: input.paymentId,
    status: 'PENDING',
    reason: input.reason,
    timestamp: approvalRequest.requestedAt
  };
}
