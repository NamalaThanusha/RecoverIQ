import { prisma, pool } from '../config/prisma';
import { PaymentService } from '../services/payment/PaymentService';
import { MockPaymentGateway, Scenario } from '../services/payment/MockPaymentGateway';
import { PaymentErrorCodes, PaymentStatus } from '../types/payment';

describe('PaymentService & MockPaymentGateway', () => {
  let customer: any;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create a dummy customer to use for our test payments
    customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: `test-${Date.now()}@synthetic.recoveriq.local`,
      }
    });
  });

  afterAll(async () => {
    await prisma.customer.delete({ where: { id: customer.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  async function createTestPayment(status: string = 'FAILED', maxRetryCount: number = 3) {
    return await prisma.payment.create({
      data: {
        customerId: customer.id,
        amount: 100,
        currency: 'USD',
        status: status as import('@prisma/client').PaymentStatus,
        maxRetryCount,
        retryCount: 0,
      }
    });
  }

  async function cleanupPayment(id: string) {
    await prisma.auditLog.deleteMany({ where: { paymentId: id } });
    await prisma.payment.delete({ where: { id } });
  }

  test('Scenario A: FAILED -> SUCCESS on first retry', async () => {
    const p = await createTestPayment('FAILED');
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.A } });
    const service = new PaymentService(prisma, gateway);

    const result = await service.retryPayment(p.id);

    expect(result.success).toBe(true);
    expect(result.newStatus).toBe(PaymentStatus.SUCCESS);
    expect(result.attemptNumber).toBe(1);

    const updated = await prisma.payment.findUnique({ where: { id: p.id } });
    expect(updated?.status).toBe('SUCCESS');
    expect(updated?.retryCount).toBe(1);

    const audits = await prisma.auditLog.findMany({ where: { paymentId: p.id } });
    expect(audits.some(a => a.eventType === 'PAYMENT_RETRY_ATTEMPTED')).toBe(true);
    expect(audits.some(a => a.eventType === 'PAYMENT_STATE_CHANGED')).toBe(true);
    expect(audits.some(a => a.eventType === 'PAYMENT_RECOVERY_SUCCEEDED')).toBe(true);

    await cleanupPayment(p.id);
  });

  test('Scenario B: FAILED -> FAILED -> SUCCESS', async () => {
    const p = await createTestPayment('FAILED');
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.B } });
    const service = new PaymentService(prisma, gateway);

    // Attempt 1 -> should fail
    let result = await service.retryPayment(p.id);
    expect(result.success).toBe(false);
    expect(result.newStatus).toBe(PaymentStatus.FAILED);
    expect(result.attemptNumber).toBe(1);

    // Attempt 2 -> should succeed
    result = await service.retryPayment(p.id);
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe(PaymentStatus.SUCCESS);
    expect(result.attemptNumber).toBe(2);

    const updated = await prisma.payment.findUnique({ where: { id: p.id } });
    expect(updated?.status).toBe('SUCCESS');
    expect(updated?.retryCount).toBe(2);

    await cleanupPayment(p.id);
  });

  test('Scenario C: FAILED -> FAILED -> FAILED -> exhausted', async () => {
    const p = await createTestPayment('FAILED', 3);
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.C } });
    const service = new PaymentService(prisma, gateway);

    await service.retryPayment(p.id); // attempt 1
    await service.retryPayment(p.id); // attempt 2
    await service.retryPayment(p.id); // attempt 3

    // Attempt 4 should throw limit exceeded
    await expect(service.retryPayment(p.id)).rejects.toMatchObject({
      code: PaymentErrorCodes.RETRY_LIMIT_EXCEEDED
    });

    const updated = await prisma.payment.findUnique({ where: { id: p.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.retryCount).toBe(3);
    
    // Check for audit log for exhaustion
    const audits = await prisma.auditLog.findMany({ where: { paymentId: p.id } });
    expect(audits.some(a => a.eventType === 'PAYMENT_RETRY_EXHAUSTED')).toBe(true);

    await cleanupPayment(p.id);
  });

  test('Scenario D: SUCCESS -> retry rejected', async () => {
    const p = await createTestPayment('SUCCESS');
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.D } });
    const service = new PaymentService(prisma, gateway);

    await expect(service.retryPayment(p.id)).rejects.toMatchObject({
      code: PaymentErrorCodes.PAYMENT_ALREADY_SUCCESSFUL
    });

    await cleanupPayment(p.id);
  });

  test('PENDING -> retry rejected', async () => {
    const p = await createTestPayment('PENDING');
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.A } });
    const service = new PaymentService(prisma, gateway);

    await expect(service.retryPayment(p.id)).rejects.toMatchObject({
      code: PaymentErrorCodes.INVALID_PAYMENT_STATE
    });

    await cleanupPayment(p.id);
  });

  test('REQUIRES_ACTION -> retry rejected', async () => {
    const p = await createTestPayment('REQUIRES_ACTION');
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.A } });
    const service = new PaymentService(prisma, gateway);

    await expect(service.retryPayment(p.id)).rejects.toMatchObject({
      code: PaymentErrorCodes.PAYMENT_REQUIRES_ACTION
    });

    await cleanupPayment(p.id);
  });

  test('nonexistent payment -> typed error', async () => {
    const gateway = new MockPaymentGateway({ scenarios: {} });
    const service = new PaymentService(prisma, gateway);

    await expect(service.retryPayment('fake-uuid')).rejects.toMatchObject({
      code: PaymentErrorCodes.PAYMENT_NOT_FOUND
    });
  });

  test('verifyPayment updates status and writes audit log', async () => {
    const p = await createTestPayment('FAILED');
    const gateway = new MockPaymentGateway({ scenarios: { [p.id]: Scenario.D } }); // Scenario D gives SUCCESS in getPaymentStatus
    const service = new PaymentService(prisma, gateway);

    const result = await service.verifyPayment(p.id);
    
    expect(result.previousStatus).toBe(PaymentStatus.FAILED);
    expect(result.newStatus).toBe(PaymentStatus.SUCCESS);
    expect(result.success).toBe(true);

    const updated = await prisma.payment.findUnique({ where: { id: p.id } });
    expect(updated?.status).toBe('SUCCESS');

    const audits = await prisma.auditLog.findMany({ where: { paymentId: p.id } });
    expect(audits.some(a => a.eventType === 'PAYMENT_STATE_CHANGED')).toBe(true);

    await cleanupPayment(p.id);
  });
});
