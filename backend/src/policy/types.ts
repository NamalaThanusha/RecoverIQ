export interface RuleResult {
  rule: string;
  passed: boolean;
  reason: string;
}

export interface PolicyDecision {
  allowed: boolean;
  action: string;
  reason: string;
  ruleResults: RuleResult[];
  evaluatedAt: Date;
}

// Database-agnostic Domain Entities
export interface PolicyContextMerchantConfig {
  maxRetryAttempts: number;
  maxDiscountPercent: number;
  minimumConfidence: number;
  highValueThreshold: number;
  highValueApprovalRequired: boolean;
  active: boolean;
}

export interface PolicyContextPayment {
  id: string;
  status: string;
  amount: number;
  retryCount: number;
}

export interface PolicyContextOffer {
  id: string;
  discountPercent: number;
  active: boolean;
}

export interface PolicyContextCustomer {
  lifetimeValue: number;
}

// Contexts for specific evaluations
export interface RetryPolicyContext {
  payment: PolicyContextPayment;
  merchantPolicy: PolicyContextMerchantConfig;
}

export interface IncentivePolicyContext {
  payment: PolicyContextPayment;
  merchantPolicy: PolicyContextMerchantConfig;
  offer: PolicyContextOffer | null; // null if offer not found
}

export interface EscalationPolicyContext {
  payment: PolicyContextPayment;
  merchantPolicy: PolicyContextMerchantConfig;
  customer: PolicyContextCustomer;
  confidence?: number;
}

export interface ReminderPolicyContext {
  payment: PolicyContextPayment;
}

// Internal rule evaluation function type
export type RuleFunction<T> = (context: T) => RuleResult;
