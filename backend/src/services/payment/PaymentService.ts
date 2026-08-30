import { PrismaClient } from '@prisma/client';
import { PaymentGateway, PaymentResult, PaymentStatus, PaymentError, PaymentErrorCodes } from '../../types/payment';

export class PaymentService {
  constructor(private prisma: PrismaClient, private gateway: PaymentGateway) {}

  async retryPayment(paymentId: string): Promise<PaymentResult> {
    // 1. Load current payment from DB
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new PaymentError(PaymentErrorCodes.PAYMENT_NOT_FOUND, `Payment ${paymentId} not found`);
    }

    // 2. Validate state
    if (payment.status === PaymentStatus.SUCCESS) {
      throw new PaymentError(PaymentErrorCodes.PAYMENT_ALREADY_SUCCESSFUL, `Payment ${paymentId} is already successful`);
    }
    if (payment.status === PaymentStatus.PENDING) {
      throw new PaymentError(PaymentErrorCodes.INVALID_PAYMENT_STATE, `Cannot explicitly retry a PENDING payment`);
    }
    if (payment.status === PaymentStatus.REQUIRES_ACTION) {
      throw new PaymentError(PaymentErrorCodes.PAYMENT_REQUIRES_ACTION, `Payment requires customer action`);
    }

    // 3. Validate retry limit
    if (payment.retryCount >= payment.maxRetryCount) {
      // Record audit log for exhaustion if not already exhausted?
      // For simplicity, we just reject here, but we can also log it.
      await this.prisma.auditLog.create({
        data: {
          paymentId: payment.id,
          eventType: 'PAYMENT_RETRY_EXHAUSTED',
          message: `Retry limit reached for payment ${paymentId}`,
        }
      });
      throw new PaymentError(PaymentErrorCodes.RETRY_LIMIT_EXCEEDED, `Retry limit exceeded for payment ${paymentId}`);
    }

    // Attempting retry. The new attempt number is the current retryCount + 1
    const attemptNumber = payment.retryCount + 1;

    // 4. Call gateway
    const result = await this.gateway.retryPayment(paymentId, attemptNumber);

    // 5. Persist resulting state atomically
    const finalPayment = await this.prisma.$transaction(async (tx) => {
      // Re-fetch to ensure no concurrent updates happened
      const currentPayment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!currentPayment || currentPayment.retryCount !== payment.retryCount) {
        throw new Error('Concurrency error: Payment state changed during retry');
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: result.newStatus as import('@prisma/client').PaymentStatus, // Cast domain status to Prisma enum
          retryCount: attemptNumber,
          failureReason: result.success ? null : result.reason,
          recoveredAt: result.success ? new Date() : null,
        }
      });

      // 6. Create Audit Logs
      await tx.auditLog.create({
        data: {
          paymentId: payment.id,
          eventType: 'PAYMENT_RETRY_ATTEMPTED',
          message: `Attempted retry ${attemptNumber} for payment ${paymentId}`,
          metadata: { attemptNumber, previousStatus: payment.status }
        }
      });

      if (payment.status !== result.newStatus) {
         await tx.auditLog.create({
          data: {
            paymentId: payment.id,
            eventType: 'PAYMENT_STATE_CHANGED',
            message: `Payment ${paymentId} state changed from ${payment.status} to ${result.newStatus}`,
            metadata: { newStatus: result.newStatus }
          }
        });
      }

      if (result.success) {
        await tx.auditLog.create({
          data: {
            paymentId: payment.id,
            eventType: 'PAYMENT_RECOVERY_SUCCEEDED',
            message: `Payment ${paymentId} successfully recovered on attempt ${attemptNumber}`,
            metadata: { attemptNumber }
          }
        });
      }

      return updated;
    });

    return {
      paymentId: finalPayment.id,
      previousStatus: payment.status as PaymentStatus,
      newStatus: finalPayment.status as PaymentStatus,
      attemptNumber: finalPayment.retryCount,
      success: finalPayment.status === PaymentStatus.SUCCESS,
      reason: result.reason,
      timestamp: new Date(),
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new PaymentError(PaymentErrorCodes.PAYMENT_NOT_FOUND, `Payment ${paymentId} not found`);
    }

    const result = await this.gateway.verifyPayment(paymentId);

    if (payment.status !== result.newStatus) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const up = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: result.newStatus as import('@prisma/client').PaymentStatus,
            failureReason: result.success ? null : result.reason,
          }
        });

        await tx.auditLog.create({
          data: {
            paymentId: payment.id,
            eventType: 'PAYMENT_STATE_CHANGED',
            message: `Payment ${paymentId} state changed from ${payment.status} to ${result.newStatus} during verification`,
            metadata: { newStatus: result.newStatus, verification: true }
          }
        });
        return up;
      });

      return {
        ...result,
        previousStatus: payment.status as PaymentStatus,
        newStatus: updated.status as PaymentStatus,
      };
    }

    return {
      ...result,
      previousStatus: payment.status as PaymentStatus,
    };
  }
}
