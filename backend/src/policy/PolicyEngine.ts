import {
  RetryPolicyContext,
  IncentivePolicyContext,
  ReminderPolicyContext,
  EscalationPolicyContext,
  PolicyDecision,
  RuleResult
} from './types';

import * as retryRules from './rules/retryRules';
import * as incentiveRules from './rules/incentiveRules';
import * as reminderRules from './rules/reminderRules';
import * as escalationRules from './rules/escalationRules';

export class PolicyEngine {
  
  public evaluateRetry(context: RetryPolicyContext): PolicyDecision {
    const rules = [
      retryRules.paymentExistsRule(context),
      retryRules.paymentStatusFailedRule(context),
      retryRules.retryLimitNotExceededRule(context)
    ];

    return this.compileDecision('retry_payment', rules, true); // true = all must pass
  }

  public evaluateIncentive(context: IncentivePolicyContext): PolicyDecision {
    const rules = [
      incentiveRules.paymentExistsRule(context),
      incentiveRules.paymentEligibleForIncentiveRule(context),
      incentiveRules.offerExistsRule(context),
      incentiveRules.offerActiveRule(context),
      incentiveRules.discountWithinLimitRule(context)
    ];

    return this.compileDecision('offer_recovery_incentive', rules, true);
  }

  public evaluateReminder(context: ReminderPolicyContext): PolicyDecision {
    const rules = [
      reminderRules.paymentExistsRule(context),
      reminderRules.paymentEligibleForReminderRule(context)
    ];

    return this.compileDecision('send_payment_reminder', rules, true);
  }

  public evaluateEscalation(context: EscalationPolicyContext): PolicyDecision {
    const baseRules = [
      escalationRules.paymentExistsRule(context),
      escalationRules.paymentEligibleForEscalationRule(context)
    ];

    const triggers = [
      escalationRules.retryExhaustedTrigger(context),
      escalationRules.highValueCustomerTrigger(context),
      escalationRules.requiresActionTrigger(context),
      escalationRules.lowConfidenceTrigger(context)
    ];

    // Base rules MUST all pass
    const basePassed = baseRules.every(r => r.passed);
    // At least ONE trigger MUST pass
    const triggered = triggers.some(r => r.passed);
    
    const allowed = basePassed && triggered;
    
    const allResults = [...baseRules, ...triggers];

    let reason = 'Escalation conditions met.';
    if (!basePassed) {
      reason = 'Payment is not eligible for escalation.';
    } else if (!triggered) {
      reason = 'No objective trigger conditions met for escalation.';
    }

    return {
      allowed,
      action: 'escalate_case',
      reason,
      ruleResults: allResults,
      evaluatedAt: new Date()
    };
  }

  /**
   * Compiles a standard ALL_MUST_PASS decision
   */
  private compileDecision(action: string, ruleResults: RuleResult[], allMustPass: boolean): PolicyDecision {
    let allowed = false;
    
    if (allMustPass) {
      allowed = ruleResults.every(r => r.passed);
    } else {
      allowed = ruleResults.some(r => r.passed); // If we ever need ANY
    }

    let reason = allowed ? 'All policy rules passed.' : 'One or more policy rules failed.';
    
    if (!allowed) {
      const failed = ruleResults.filter(r => !r.passed);
      if (failed.length > 0) {
        reason = failed.map(f => f.reason).join(' ');
      }
    }

    return {
      allowed,
      action,
      reason,
      ruleResults,
      evaluatedAt: new Date()
    };
  }
}
