import { prisma, pool } from '../../config/prisma';
import { Evaluator } from '../../evaluation/Evaluator';
import { toMinorUnits } from '../../utils/money';

// We mock Gemini for tests so we don't hit rate limits or require API keys
import { GoogleGenAI } from '@google/genai';
jest.mock('@google/genai', () => {
  let activePaymentId = 'unknown';
  let mockCount = 0;
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      interactions: {
        create: jest.fn().mockImplementation(async (params: any) => {
          mockCount++;
          
          if (params.input && typeof params.input === 'string') {
            const match = params.input.match(/payment ID:\s*([a-zA-Z0-9-]+)/);
            if (match) activePaymentId = match[1];
          }

          if (mockCount % 2 !== 0) {
            return {
              id: `inter-${mockCount}`,
              outputs: [{
                type: 'function_call',
                name: 'retry_payment',
                id: `call-${mockCount}`,
                arguments: { paymentId: activePaymentId } 
              }]
            };
          } else {
            return {
              id: `inter-${mockCount}`,
              outputs: [{ type: 'text', text: 'Done.' }]
            };
          }
        })
      }
    })),
    Type: { OBJECT: 'OBJECT', STRING: 'STRING' }
  };
});

describe('Evaluator & Determinism', () => {
  let evaluator: Evaluator;
  let customerId: string;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test customer
    const customer = await prisma.customer.create({
      data: { name: 'Eval Test', email: `eval-${Date.now()}@example.com` }
    });
    customerId = customer.id;

    // Create 6 FAILED payments and 1 SUCCESS payment with old timestamps so they sort first
    for (let i = 0; i < 6; i++) {
      await prisma.payment.create({
        data: { customerId, amount: 100, status: 'FAILED', createdAt: new Date('1970-01-01T00:00:00Z') }
      });
    }
    await prisma.payment.create({
      data: { customerId, amount: 100, status: 'SUCCESS', createdAt: new Date('1970-01-01T00:00:00Z') }
    });

    evaluator = new Evaluator(prisma);
  });

  afterAll(async () => {
    const payments = await prisma.payment.findMany({ where: { customerId } });
    const paymentIds = payments.map(p => p.id);
    await prisma.agentAction.deleteMany({ where: { agentRun: { paymentId: { in: paymentIds } } } });
    await prisma.auditLog.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.agentRun.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { customerId } });
    await prisma.customer.delete({ where: { id: customerId } });
  });

  it('should run a deterministic batch and compute correct metrics', async () => {
    // Run 1
    const res1 = await evaluator.runEvaluation();
    
    expect(res1.totalPaymentsEvaluated).toBe(7);
    expect(res1.failedPaymentsEvaluated).toBe(6);
    expect(res1.scenarioResults['A'].count).toBe(2);
    expect(res1.scenarioResults['B'].count).toBe(2);
    expect(res1.scenarioResults['C'].count).toBe(2);
    expect(res1.scenarioResults['D'].count).toBe(1);

    // Scenario A: 2 payments, both should succeed
    expect(res1.scenarioResults['A'].recoveredCount).toBe(2);
    
    // Scenario D: 1 payment, should NOT be recovered (was already success)
    expect(res1.scenarioResults['D'].recoveredCount).toBe(0);

    // Reset test fixtures back to FAILED before res2 so res2 fetches the SAME fixtures
    await prisma.payment.updateMany({
      where: { customerId, status: 'SUCCESS' },
      data: { status: 'FAILED' }
    });
    // Restore the one intentional SUCCESS fixture
    const allCustPayments = await prisma.payment.findMany({ where: { customerId }, orderBy: { createdAt: 'asc' } });
    if (allCustPayments.length > 6) {
      await prisma.payment.update({
        where: { id: allCustPayments[6].id },
        data: { status: 'SUCCESS' }
      });
    }

    // Run 2: determinism test
    const res2 = await evaluator.runEvaluation();

    expect(res2.totalPaymentsEvaluated).toBe(res1.totalPaymentsEvaluated);
    expect(res2.recoveredRevenueMinor).toBe(res1.recoveredRevenueMinor);
    expect(res2.unrecoveredRevenueMinor).toBe(res1.unrecoveredRevenueMinor);
    expect(res2.recoverySuccessCount).toBe(res1.recoverySuccessCount);
    expect(res2.recoveryFailureCount).toBe(res1.recoveryFailureCount);
    expect(res2.retryAttempts).toBe(res1.retryAttempts);
    expect(res2.policyBlocks).toBe(res1.policyBlocks);
    expect(res2.recoveryRateByCount).toBe(res1.recoveryRateByCount);
  }, 60000); // 60s timeout
});
