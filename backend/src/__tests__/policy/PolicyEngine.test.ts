import { PolicyEngine } from '../../policy/PolicyEngine';
import { PolicyContextMerchantConfig, PolicyContextPayment, PolicyContextOffer, PolicyContextCustomer } from '../../policy/types';

describe('PolicyEngine Deterministic Tests', () => {
  let engine: PolicyEngine;

  const defaultPolicy: PolicyContextMerchantConfig = {
    maxRetryAttempts: 3,
    maxDiscountPercent: 15.0,
    minimumConfidence: 0.70,
    highValueThreshold: 1000.0,
    highValueApprovalRequired: true,
    active: true,
  };

  const defaultPayment: PolicyContextPayment = {
    id: 'pay_123',
    status: 'FAILED',
    amount: 100.0,
    retryCount: 0,
  };

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  describe('evaluateRetry', () => {
    it('1. valid failed payment -> ALLOW', () => {
      const result = engine.evaluateRetry({ payment: defaultPayment, merchantPolicy: defaultPolicy });
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('retry_payment');
    });

    it('2. successful payment -> BLOCK', () => {
      const p = { ...defaultPayment, status: 'SUCCESS' };
      const result = engine.evaluateRetry({ payment: p, merchantPolicy: defaultPolicy });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expected FAILED');
    });

    it('3. pending payment -> BLOCK', () => {
      const p = { ...defaultPayment, status: 'PENDING' };
      const result = engine.evaluateRetry({ payment: p, merchantPolicy: defaultPolicy });
      expect(result.allowed).toBe(false);
    });

    it('4. requires-action payment -> BLOCK', () => {
      const p = { ...defaultPayment, status: 'REQUIRES_ACTION' };
      const result = engine.evaluateRetry({ payment: p, merchantPolicy: defaultPolicy });
      expect(result.allowed).toBe(false);
    });

    it('5. retry limit reached -> BLOCK', () => {
      const p = { ...defaultPayment, retryCount: 3 };
      const result = engine.evaluateRetry({ payment: p, merchantPolicy: defaultPolicy });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('reached or exceeded');
    });
  });

  describe('evaluateIncentive', () => {
    const defaultOffer: PolicyContextOffer = { id: 'off_1', discountPercent: 10, active: true };

    it('6. active valid offer within limit -> ALLOW', () => {
      const result = engine.evaluateIncentive({ payment: defaultPayment, merchantPolicy: defaultPolicy, offer: defaultOffer });
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('offer_recovery_incentive');
    });

    it('7. inactive offer -> BLOCK', () => {
      const offer = { ...defaultOffer, active: false };
      const result = engine.evaluateIncentive({ payment: defaultPayment, merchantPolicy: defaultPolicy, offer });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    it('8. discount exceeds max -> BLOCK', () => {
      const offer = { ...defaultOffer, discountPercent: 20 };
      const result = engine.evaluateIncentive({ payment: defaultPayment, merchantPolicy: defaultPolicy, offer });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds merchant maximum');
    });

    it('9. nonexistent offer -> BLOCK', () => {
      const result = engine.evaluateIncentive({ payment: defaultPayment, merchantPolicy: defaultPolicy, offer: null });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Recovery offer was not found');
    });

    it('10. invalid payment state -> BLOCK', () => {
      const p = { ...defaultPayment, status: 'SUCCESS' };
      const result = engine.evaluateIncentive({ payment: p, merchantPolicy: defaultPolicy, offer: defaultOffer });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not eligible');
    });
  });

  describe('evaluateReminder', () => {
    it('11. valid eligible payment -> ALLOW', () => {
      const result = engine.evaluateReminder({ payment: defaultPayment });
      expect(result.allowed).toBe(true);
    });

    it('12. successful payment -> BLOCK', () => {
      const p = { ...defaultPayment, status: 'SUCCESS' };
      const result = engine.evaluateReminder({ payment: p });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already successful');
    });
  });

  describe('evaluateEscalation', () => {
    const defaultCustomer: PolicyContextCustomer = { lifetimeValue: 500 };

    it('13. retry exhausted -> ALLOW', () => {
      const p = { ...defaultPayment, retryCount: 3 };
      const result = engine.evaluateEscalation({ payment: p, merchantPolicy: defaultPolicy, customer: defaultCustomer });
      expect(result.allowed).toBe(true);
      expect(result.ruleResults.find(r => r.rule === 'TRIGGER_RETRY_EXHAUSTED')?.passed).toBe(true);
    });

    it('14. high-value customer requiring approval -> ALLOW', () => {
      const cust = { ...defaultCustomer, lifetimeValue: 2000 };
      const result = engine.evaluateEscalation({ payment: defaultPayment, merchantPolicy: defaultPolicy, customer: cust });
      expect(result.allowed).toBe(true);
      expect(result.ruleResults.find(r => r.rule === 'TRIGGER_HIGH_VALUE_CUSTOMER')?.passed).toBe(true);
    });

    it('15. REQUIRES_ACTION -> ALLOW', () => {
      const p = { ...defaultPayment, status: 'REQUIRES_ACTION' };
      const result = engine.evaluateEscalation({ payment: p, merchantPolicy: defaultPolicy, customer: defaultCustomer });
      expect(result.allowed).toBe(true);
      expect(result.ruleResults.find(r => r.rule === 'TRIGGER_REQUIRES_ACTION')?.passed).toBe(true);
    });

    it('16. low confidence below threshold -> ALLOW', () => {
      const result = engine.evaluateEscalation({ payment: defaultPayment, merchantPolicy: defaultPolicy, customer: defaultCustomer, confidence: 0.5 });
      expect(result.allowed).toBe(true);
      expect(result.ruleResults.find(r => r.rule === 'TRIGGER_LOW_CONFIDENCE')?.passed).toBe(true);
    });

    it('17. no objective trigger -> BLOCK', () => {
      const result = engine.evaluateEscalation({ payment: defaultPayment, merchantPolicy: defaultPolicy, customer: defaultCustomer, confidence: 0.8 });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No objective trigger');
    });

    it('18. invalid payment state blocks despite triggers', () => {
      const p = { ...defaultPayment, status: 'SUCCESS' };
      const result = engine.evaluateEscalation({ payment: p, merchantPolicy: defaultPolicy, customer: defaultCustomer, confidence: 0.5 });
      // Low confidence is a trigger, but payment is successful -> base rule fails
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not eligible');
    });
  });

  describe('Determinism and formatting', () => {
    it('identical context produces identical decision', () => {
      const r1 = engine.evaluateRetry({ payment: defaultPayment, merchantPolicy: defaultPolicy });
      const r2 = engine.evaluateRetry({ payment: defaultPayment, merchantPolicy: defaultPolicy });
      
      // We strip out evaluatedAt because it's a Date
      const { evaluatedAt: t1, ...dec1 } = r1;
      const { evaluatedAt: t2, ...dec2 } = r2;
      expect(dec1).toEqual(dec2);
    });

    it('multiple failures are represented in reason and results', () => {
      const p = { ...defaultPayment, status: 'SUCCESS', retryCount: 5 };
      const result = engine.evaluateRetry({ payment: p, merchantPolicy: defaultPolicy });
      expect(result.allowed).toBe(false);
      expect(result.ruleResults.filter(r => !r.passed).length).toBe(2);
      expect(result.reason).toContain('expected FAILED');
      expect(result.reason).toContain('reached or exceeded');
    });
  });
});
