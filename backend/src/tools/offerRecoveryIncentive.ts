import { PrismaClient, PaymentStatus } from '@prisma/client';
import { OfferRecoveryIncentiveInput, OfferRecoveryIncentiveOutput } from './types';
import { ToolError, ToolErrorCodes } from './errors';
import * as crypto from 'crypto';

export async function offerRecoveryIncentive(
  prisma: PrismaClient,
  input: OfferRecoveryIncentiveInput
): Promise<OfferRecoveryIncentiveOutput> {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId }
  });

  if (!payment) {
    throw new ToolError(
      ToolErrorCodes.PAYMENT_NOT_FOUND,
      `Payment with ID ${input.paymentId} not found`
    );
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    throw new ToolError(
      ToolErrorCodes.INVALID_PAYMENT_STATE,
      `Cannot offer incentive for already successful payment ${input.paymentId}`
    );
  }

  const offer = await prisma.recoveryOffer.findUnique({
    where: { id: input.offerId }
  });

  if (!offer) {
    throw new ToolError(
      ToolErrorCodes.OFFER_NOT_FOUND,
      `Recovery offer with ID ${input.offerId} not found`
    );
  }

  if (!offer.active) {
    throw new ToolError(
      ToolErrorCodes.OFFER_INACTIVE,
      `Recovery offer with ID ${input.offerId} is inactive`
    );
  }

  // Validate discount doesn't exceed policy max
  const policy = await prisma.merchantPolicy.findFirst({
    where: { active: true }
  });

  const maxDiscountPercent = policy?.maxDiscountPercent ?? 100.0;
  if (offer.discountPercent > maxDiscountPercent) {
    throw new ToolError(
      ToolErrorCodes.INCENTIVE_NOT_ALLOWED,
      `Offer discount ${offer.discountPercent}% exceeds maximum allowed ${maxDiscountPercent}%`
    );
  }

  const proposedAmount = payment.amount * (1 - offer.discountPercent / 100);
  const incentiveId = `inc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  await prisma.auditLog.create({
    data: {
      paymentId: input.paymentId,
      eventType: 'RECOVERY_INCENTIVE_PROPOSED',
      message: `Proposed incentive for payment ${input.paymentId} with offer ${input.offerId}`,
      metadata: {
        offerId: input.offerId,
        incentiveId,
        discountPercent: offer.discountPercent,
        proposedAmount
      }
    }
  });

  return {
    incentiveId,
    paymentId: input.paymentId,
    offerId: input.offerId,
    discountPercent: offer.discountPercent,
    proposedAmount,
    status: 'PROPOSED'
  };
}
