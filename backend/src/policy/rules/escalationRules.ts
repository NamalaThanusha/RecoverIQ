import { EscalationPolicyContext, RuleResult } from '../types';

export function paymentExistsRule(context: EscalationPolicyContext): RuleResult {
  const passed = !!context.payment;
  return {
    rule: 'PAYMENT_EXISTS',
    passed,
    reason: passed ? 'Payment exists.' : 'Payment context is missing.',
  };
}

export function paymentEligibleForEscalationRule(context: EscalationPolicyContext): RuleResult {
  if (!context.payment) {
    return { rule: 'PAYMENT_ELIGIBLE', passed: false, reason: 'Missing payment context.' };
  }
  const passed = context.payment.status === 'FAILED' || context.payment.status === 'REQUIRES_ACTION';
  return {
    rule: 'PAYMENT_ELIGIBLE',
    passed,
    reason: passed 
      ? `Payment status ${context.payment.status} is eligible for escalation.`
      : `Payment status ${context.payment.status} is not eligible for escalation.`,
  };
}

// Objective triggers
export function retryExhaustedTrigger(context: EscalationPolicyContext): RuleResult {
  if (!context.payment || !context.merchantPolicy) {
    return { rule: 'TRIGGER_RETRY_EXHAUSTED', passed: false, reason: 'Missing context.' };
  }
  const passed = context.payment.retryCount >= context.merchantPolicy.maxRetryAttempts;
  return {
    rule: 'TRIGGER_RETRY_EXHAUSTED',
    passed,
    reason: passed 
      ? `Retry attempts (${context.payment.retryCount}) reached maximum.` 
      : `Retry attempts (${context.payment.retryCount}) below maximum.`,
  };
}

export function highValueCustomerTrigger(context: EscalationPolicyContext): RuleResult {
  if (!context.customer || !context.merchantPolicy) {
    return { rule: 'TRIGGER_HIGH_VALUE_CUSTOMER', passed: false, reason: 'Missing context.' };
  }
  const isHighValue = context.customer.lifetimeValue >= context.merchantPolicy.highValueThreshold;
  const requiresApproval = context.merchantPolicy.highValueApprovalRequired;
  const passed = isHighValue && requiresApproval;
  return {
    rule: 'TRIGGER_HIGH_VALUE_CUSTOMER',
    passed,
    reason: passed 
      ? `Customer LTV (${context.customer.lifetimeValue}) meets high value threshold.` 
      : 'Customer does not meet high value escalation criteria.',
  };
}

export function requiresActionTrigger(context: EscalationPolicyContext): RuleResult {
  if (!context.payment) {
    return { rule: 'TRIGGER_REQUIRES_ACTION', passed: false, reason: 'Missing context.' };
  }
  const passed = context.payment.status === 'REQUIRES_ACTION';
  return {
    rule: 'TRIGGER_REQUIRES_ACTION',
    passed,
    reason: passed 
      ? 'Payment explicitly requires customer/human action.' 
      : 'Payment does not explicitly require action.',
  };
}

export function lowConfidenceTrigger(context: EscalationPolicyContext): RuleResult {
  if (context.confidence === undefined || context.confidence === null || !context.merchantPolicy) {
    return { rule: 'TRIGGER_LOW_CONFIDENCE', passed: false, reason: 'No confidence score provided.' };
  }
  const passed = context.confidence < context.merchantPolicy.minimumConfidence;
  return {
    rule: 'TRIGGER_LOW_CONFIDENCE',
    passed,
    reason: passed 
      ? `Agent confidence (${context.confidence}) is below minimum (${context.merchantPolicy.minimumConfidence}).` 
      : `Agent confidence (${context.confidence}) is acceptable.`,
  };
}
