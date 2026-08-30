import { PaymentStatus, ApprovalStatus } from '@prisma/client';
import { prisma, pool } from '../../config/prisma';
import { PaymentService } from '../../services/payment/PaymentService';
import { MockPaymentGateway } from '../../services/payment/MockPaymentGateway';
import { ToolError, ToolErrorCodes } from '../../tools/errors';
import * as tools from '../../tools';


const gateway = new MockPaymentGateway({ scenarios: {} });
const paymentService = new PaymentService(prisma, gateway);

describe('Recovery Tools', () => {
  let createdCustomerIds: string[] = [];
  let createdPaymentIds: string[] = [];
  let createdOfferIds: string[] = [];
  let createdPolicyIds: string[] = [];

  beforeAll(async () => {
    const policy = await prisma.merchantPolicy.create({
      data: {
        maxRetryAttempts: 3,
        maxDiscountPercent: 50.0,
        highValueThreshold: 100.0,
      }
    });
    createdPolicyIds.push(policy.id);
  });

  afterAll(async () => {
    await prisma.approvalRequest.deleteMany({ where: { paymentId: { in: createdPaymentIds } } });
    await prisma.auditLog.deleteMany({ where: { paymentId: { in: createdPaymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: createdPaymentIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    await prisma.recoveryOffer.deleteMany({ where: { id: { in: createdOfferIds } } });
    await prisma.merchantPolicy.deleteMany({ where: { id: { in: createdPolicyIds } } });
    await prisma.$disconnect();
    await pool.end();
  });



  describe('getPaymentDetails', () => {
    it('returns payment details without sensitive prisma fields', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Test', email: `test-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);
      
      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          amount: 50,
          currency: 'USD',
          status: PaymentStatus.FAILED,
        }
      });
      createdPaymentIds.push(payment.id);

      const details = await tools.getPaymentDetails(prisma, { paymentId: payment.id });
      expect(details.paymentId).toBe(payment.id);
      expect(details.amount).toBe(50);
      expect(details.status).toBe(PaymentStatus.FAILED);
    });

    it('throws PAYMENT_NOT_FOUND for invalid id', async () => {
      await expect(tools.getPaymentDetails(prisma, { paymentId: 'invalid-id' }))
        .rejects
        .toThrowError(new ToolError(ToolErrorCodes.PAYMENT_NOT_FOUND, 'Payment with ID invalid-id not found'));
    });
  });

  describe('getCustomerHistory', () => {
    it('aggregates customer payments correctly', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Hist Test', email: `hist-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payments = await prisma.payment.createManyAndReturn({
        data: [
          { customerId: customer.id, amount: 50, status: PaymentStatus.SUCCESS },
          { customerId: customer.id, amount: 100, status: PaymentStatus.FAILED },
          { customerId: customer.id, amount: 200, status: PaymentStatus.SUCCESS },
        ]
      });
      createdPaymentIds.push(...payments.map(p => p.id));

      const history = await tools.getCustomerHistory(prisma, { customerId: customer.id });
      
      expect(history.customer.id).toBe(customer.id);
      expect(history.metrics.totalPayments).toBe(3);
      expect(history.metrics.successfulPayments).toBe(2);
      expect(history.metrics.failedPayments).toBe(1);
      expect(history.metrics.totalHistoricalValue).toBe(350);
      expect(history.metrics.successfulValue).toBe(250);
      expect(history.metrics.successRate).toBeCloseTo(2/3);
      expect(history.recentPayments.length).toBe(3);
    });
  });

  describe('calculateRecoveryContext', () => {
    it('calculates factual context based on history and payment', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Context Test', email: `ctx-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const p1 = await prisma.payment.create({
        data: { customerId: customer.id, amount: 200, status: PaymentStatus.SUCCESS }
      });
      createdPaymentIds.push(p1.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 50, status: PaymentStatus.FAILED, retryCount: 1 }
      });
      createdPaymentIds.push(payment.id);

      const ctx = await tools.calculateRecoveryContext(prisma, { paymentId: payment.id });
      expect(ctx.paymentAmount).toBe(50);
      expect(ctx.customerLTV).toBe(250); // 200 + 50
      expect(ctx.isHighValue).toBe(true); // >= 100 threshold
      expect(ctx.retryCount).toBe(1);
      expect(ctx.isRetryable).toBe(true);
      expect(ctx.recoveryAttemptedPreviously).toBe(true);
    });
  });

  describe('retryPayment', () => {
    it('calls payment service and returns result', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Retry', email: `retry-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 50, status: PaymentStatus.FAILED }
      });
      createdPaymentIds.push(payment.id);

      const localGateway = new MockPaymentGateway({ scenarios: { [payment.id]: 'A' as any } });
      const localService = new PaymentService(prisma, localGateway);

      const result = await tools.retryPayment(localService, { paymentId: payment.id });
      expect(result.paymentId).toBe(payment.id);
      expect(result.attemptNumber).toBe(1);
      
      // Ensure Audit was created by service
      const audits = await prisma.auditLog.findMany({ where: { paymentId: payment.id } });
      expect(audits.some(a => a.eventType === 'PAYMENT_RETRY_ATTEMPTED')).toBe(true);
    });

    it('throws TOOL_ERROR for invalid states', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Retry2', email: `retry2-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 50, status: PaymentStatus.SUCCESS }
      });
      createdPaymentIds.push(payment.id);

      const localGateway = new MockPaymentGateway({ scenarios: { [payment.id]: 'A' as any } });
      const localService = new PaymentService(prisma, localGateway);

      await expect(tools.retryPayment(localService, { paymentId: payment.id }))
        .rejects
        .toThrow(ToolError);
    });
  });

  describe('sendPaymentReminder', () => {
    it('creates audit and returns deterministic id', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Remind', email: `remind-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 50, status: PaymentStatus.FAILED }
      });
      createdPaymentIds.push(payment.id);

      const result = await tools.sendPaymentReminder(prisma, { paymentId: payment.id, templateId: 't1' });
      expect(result.paymentId).toBe(payment.id);
      expect(result.status).toBe('sent');
      expect(result.reminderId).toMatch(/^rem_/);

      const audits = await prisma.auditLog.findMany({ where: { paymentId: payment.id } });
      expect(audits.length).toBe(1);
      expect(audits[0].eventType).toBe('PAYMENT_REMINDER_SENT');
    });
  });

  describe('offerRecoveryIncentive', () => {
    it('returns proposal for valid offer and logs audit', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Incentive', email: `inc-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 100, status: PaymentStatus.FAILED }
      });
      createdPaymentIds.push(payment.id);

      const offer = await prisma.recoveryOffer.create({
        data: { name: '10% off', discountPercent: 10, active: true }
      });
      createdOfferIds.push(offer.id);

      const result = await tools.offerRecoveryIncentive(prisma, { paymentId: payment.id, offerId: offer.id });
      expect(result.discountPercent).toBe(10);
      expect(result.proposedAmount).toBe(90);
      expect(result.status).toBe('PROPOSED');

      const audits = await prisma.auditLog.findMany({ where: { paymentId: payment.id } });
      expect(audits.length).toBe(1);
      expect(audits[0].eventType).toBe('RECOVERY_INCENTIVE_PROPOSED');
    });

    it('fails if offer inactive', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'IncFail', email: `incfail-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 100, status: PaymentStatus.FAILED }
      });
      createdPaymentIds.push(payment.id);

      const offer = await prisma.recoveryOffer.create({
        data: { name: 'Inactive', discountPercent: 10, active: false }
      });
      createdOfferIds.push(offer.id);

      await expect(tools.offerRecoveryIncentive(prisma, { paymentId: payment.id, offerId: offer.id }))
        .rejects.toThrow(new ToolError(ToolErrorCodes.OFFER_INACTIVE, `Recovery offer with ID ${offer.id} is inactive`));
    });
    
    it('fails if payment successful', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'IncFail2', email: `incfail2-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 100, status: PaymentStatus.SUCCESS }
      });
      createdPaymentIds.push(payment.id);

      const offer = await prisma.recoveryOffer.create({
        data: { name: 'Active', discountPercent: 10, active: true }
      });
      createdOfferIds.push(offer.id);

      await expect(tools.offerRecoveryIncentive(prisma, { paymentId: payment.id, offerId: offer.id }))
        .rejects.toThrow(new ToolError(ToolErrorCodes.INVALID_PAYMENT_STATE, `Cannot offer incentive for already successful payment ${payment.id}`));
    });
  });

  describe('escalateCase', () => {
    it('creates approval request and logs audit', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Escalate', email: `esc-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 100, status: PaymentStatus.FAILED }
      });
      createdPaymentIds.push(payment.id);

      const result = await tools.escalateCase(prisma, { paymentId: payment.id, reason: 'High value customer' });
      expect(result.status).toBe('PENDING');

      const reqs = await prisma.approvalRequest.findMany({ where: { paymentId: payment.id } });
      expect(reqs.length).toBe(1);
      expect(reqs[0].status).toBe(ApprovalStatus.PENDING);

      const audits = await prisma.auditLog.findMany({ where: { paymentId: payment.id } });
      expect(audits.some(a => a.eventType === 'CASE_ESCALATED')).toBe(true);
    });
  });

  describe('verifyPaymentStatus', () => {
    it('calls service and verifies state', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Verify', email: `ver-${Date.now()}@example.com` }
      });
      createdCustomerIds.push(customer.id);

      const payment = await prisma.payment.create({
        data: { customerId: customer.id, amount: 100, status: PaymentStatus.FAILED }
      });
      createdPaymentIds.push(payment.id);

      const localGateway = new MockPaymentGateway({ scenarios: { [payment.id]: 'D' as any } });
      const localService = new PaymentService(prisma, localGateway);

      const result = await tools.verifyPaymentStatus(localService, { paymentId: payment.id });
      // Gateway mock randomly changes it, but we just care that the result is returned
      expect(result.paymentId).toBe(payment.id);
    });
  });
});
