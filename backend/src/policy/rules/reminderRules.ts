import { ReminderPolicyContext, RuleResult } from '../types';

export function paymentExistsRule(context: ReminderPolicyContext): RuleResult {
  const passed = !!context.payment;
  return {
    rule: 'PAYMENT_EXISTS',
    passed,
    reason: passed ? 'Payment exists.' : 'Payment context is missing.',
  };
}

export function paymentEligibleForReminderRule(context: ReminderPolicyContext): RuleResult {
  if (!context.payment) {
    return { rule: 'PAYMENT_ELIGIBLE_FOR_REMINDER', passed: false, reason: 'Payment context is missing.' };
  }
  const passed = context.payment.status !== 'SUCCESS';
  return {
    rule: 'PAYMENT_ELIGIBLE_FOR_REMINDER',
    passed,
    reason: passed 
      ? `Payment status ${context.payment.status} is eligible for reminder.` 
      : 'Payment is already successful; reminder is unnecessary.',
  };
}
