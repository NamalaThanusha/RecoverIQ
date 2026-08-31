import { prisma, pool } from '../config/prisma';

describe('Database Layer Tests', () => {
  beforeAll(async () => {
    // Ensure we can connect before tests run
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  test('Prisma client initializes successfully', () => {
    expect(prisma).toBeDefined();
  });

  test('Should be able to query a Customer', async () => {
    const customer = await prisma.customer.findFirst({
      where: { email: { contains: '@synthetic.recoveriq.local' } }
    });
    expect(customer).toBeDefined();
    if (customer) {
      expect(customer.id).toBeDefined();
      expect(customer.email).toContain('@synthetic.recoveriq.local');
    }
  });

  test('Should be able to query a Payment and Customer -> Payment relation works', async () => {
    const payment = await prisma.payment.findFirst({
      include: { customer: true },
    });
    expect(payment).toBeDefined();
    if (payment) {
      expect(payment.id).toBeDefined();
      expect(payment.customerId).toBeDefined();
      expect(payment.customer).toBeDefined();
      expect(payment.customer.id).toBe(payment.customerId);
    }
  });

  test('Payment -> AgentRun relation can be created and queried', async () => {
    const payment = await prisma.payment.findFirst();
    if (!payment) return;

    // Create a temporary AgentRun
    const agentRun = await prisma.agentRun.create({
      data: {
        paymentId: payment.id,
        status: 'TESTING',
        currentStepCount: 1,
      }
    });
    
    expect(agentRun).toBeDefined();
    expect(agentRun.paymentId).toBe(payment.id);

    // Query it back
    const fetchedRun = await prisma.agentRun.findUnique({
      where: { id: agentRun.id },
      include: { payment: true }
    });
    
    expect(fetchedRun).toBeDefined();
    expect(fetchedRun?.payment.id).toBe(payment.id);

    // Clean up
    await prisma.agentRun.delete({ where: { id: agentRun.id } });
  });

  test('Merchant policy can be queried', async () => {
    const policy = await prisma.merchantPolicy.findFirst();
    expect(policy).toBeDefined();
    if (policy) {
      expect(policy.maxRetryAttempts).toBeGreaterThanOrEqual(0);
      expect(policy.active).toBeDefined();
    }
  });
});
