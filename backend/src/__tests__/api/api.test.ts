import request from 'supertest';
import app from '../../app';
import { prisma, pool } from '../../config/prisma';

// Mock Evaluator so we don't actually run the AI for API tests
jest.mock('../../evaluation/Evaluator', () => {
  return {
    Evaluator: jest.fn().mockImplementation(() => ({
      runEvaluation: jest.fn().mockResolvedValue({
        totalPaymentsEvaluated: 7,
        failedPaymentsEvaluated: 6,
        recoveryRateByCount: 0.5
      })
    }))
  };
});

// Need to define a static latestResult mock
import { Evaluator } from '../../evaluation/Evaluator';
(Evaluator as any).latestResult = {
  totalPaymentsEvaluated: 7,
  recoveryRateByCount: 0.5
};

describe('API Endpoints', () => {
  let paymentId = '';
  let customerId = '';
  let agentRunId = '';

  beforeAll(async () => {
    await prisma.$connect();
    const customer = await prisma.customer.findFirst();
    customerId = customer!.id;
    
    const payment = await prisma.payment.findFirst({ where: { customerId } });
    paymentId = payment!.id;

    const agentRun = await prisma.agentRun.create({
      data: {
        paymentId,
        status: 'COMPLETED'
      }
    });
    agentRunId = agentRun.id;
  });

  afterAll(async () => {
    await prisma.agentRun.deleteMany({ where: { id: agentRunId } });
  });

  describe('Payment API', () => {
    it('GET /api/payments/:id should return payment details', async () => {
      const res = await request(app).get(`/api/payments/${paymentId}`);
      expect(res.status).toBe(200);
      expect(res.body.paymentId).toBe(paymentId);
    });

    it('GET /api/payments/:id/context should return context', async () => {
      const res = await request(app).get(`/api/payments/${paymentId}/context`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('paymentAmount');
    });

    it('GET /api/customers/:id should return customer history', async () => {
      const res = await request(app).get(`/api/customers/${customerId}`);
      expect(res.status).toBe(200);
      expect(res.body.customer.id).toBe(customerId);
    });

    it('GET /api/payments/invalid should return 404', async () => {
      const res = await request(app).get('/api/payments/invalid-id');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Evaluation API', () => {
    it('POST /api/evaluation/run should trigger evaluator', async () => {
      const res = await request(app).post('/api/evaluation/run');
      expect(res.status).toBe(200);
      expect(res.body.totalPaymentsEvaluated).toBe(7);
    });

    it('GET /api/evaluation/results should return latest result', async () => {
      const res = await request(app).get('/api/evaluation/results');
      expect(res.status).toBe(200);
      expect(res.body.totalPaymentsEvaluated).toBe(7);
    });
  });

  describe('Agent API', () => {
    it('GET /api/agent/runs/:id should return timeline', async () => {
      const res = await request(app).get(`/api/agent/runs/${agentRunId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(agentRunId);
    });

    it('GET /api/agent/escalations should return array', async () => {
      const res = await request(app).get('/api/agent/escalations');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
