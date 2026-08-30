import { IncentivePolicyContext, RuleResult } from '../types';

export function paymentExistsRule(context: IncentivePolicyContext): RuleResult {
  const passed = !!context.payment;
  return {
    rule: 'PAYMENT_EXISTS',
    passed,
    reason: passed ? 'Payment exists.' : 'Payment context is missing.',
  };
}

export function paymentEligibleForIncentiveRule(context: IncentivePolicyContext): RuleResult {
  const passed = context.payment?.status === 'FAILED' || context.payment?.status === 'REQUIRES_ACTION';
  return {
    rule: 'PAYMENT_ELIGIBLE_FOR_INCENTIVE',
    passed,
    reason: passed 
      ? `Payment is in eligible state: ${context.payment?.status}.`
      : `Payment status ${context.payment?.status} is not eligible for recovery incentives.`,
  };
}

export function offerExistsRule(context: IncentivePolicyContext): RuleResult {
  const passed = !!context.offer;
  return {
    rule: 'OFFER_EXISTS',
    passed,
    reason: passed ? 'Recovery offer exists.' : 'Recovery offer was not found or not provided.',
  };
}

export function offerActiveRule(context: IncentivePolicyContext): RuleResult {
  if (!context.offer) {
    return { rule: 'OFFER_ACTIVE', passed: false, reason: 'No offer to check.' };
  }
  const passed = context.offer.active;
  return {
    rule: 'OFFER_ACTIVE',
    passed,
    reason: passed ? 'Recovery offer is active.' : 'Recovery offer is inactive.',
  };
}

export function discountWithinLimitRule(context: IncentivePolicyContext): RuleResult {
  if (!context.offer || !context.merchantPolicy) {
    return { rule: 'DISCOUNT_WITHIN_LIMIT', passed: false, reason: 'Missing offer or policy context.' };
  }
  const passed = context.offer.discountPercent <= context.merchantPolicy.maxDiscountPercent;
  return {
    rule: 'DISCOUNT_WITHIN_LIMIT',
    passed,
    reason: passed 
      ? `Offer discount ${context.offer.discountPercent}% is within allowed ${context.merchantPolicy.maxDiscountPercent}%.`
      : `Offer discount ${context.offer.discountPercent}% exceeds merchant maximum ${context.merchantPolicy.maxDiscountPercent}%.`,
  };
}
