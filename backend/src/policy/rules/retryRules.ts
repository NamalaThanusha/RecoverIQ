import { RetryPolicyContext, RuleResult } from '../types';

export function paymentExistsRule(context: RetryPolicyContext): RuleResult {
  const passed = !!context.payment;
  return {
    rule: 'PAYMENT_EXISTS',
    passed,
    reason: passed ? 'Payment exists.' : 'Payment context is missing.',
  };
}

export function paymentStatusFailedRule(context: RetryPolicyContext): RuleResult {
  const passed = context.payment?.status === 'FAILED';
  return {
    rule: 'PAYMENT_STATUS_FAILED',
    passed,
    reason: passed 
      ? 'Payment is in FAILED state.' 
      : `Payment status is ${context.payment?.status}, expected FAILED.`,
  };
}

export function retryLimitNotExceededRule(context: RetryPolicyContext): RuleResult {
  if (!context.payment || !context.merchantPolicy) {
    return { rule: 'RETRY_LIMIT_NOT_EXCEEDED', passed: false, reason: 'Missing context for retry limit check.' };
  }
  const passed = context.payment.retryCount < context.merchantPolicy.maxRetryAttempts;
  return {
    rule: 'RETRY_LIMIT_NOT_EXCEEDED',
    passed,
    reason: passed 
      ? `Retry count ${context.payment.retryCount} is below maximum ${context.merchantPolicy.maxRetryAttempts}.`
      : `Retry count ${context.payment.retryCount} has reached or exceeded maximum ${context.merchantPolicy.maxRetryAttempts}.`,
  };
}
