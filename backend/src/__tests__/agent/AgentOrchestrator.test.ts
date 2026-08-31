import { prisma, pool } from '../../config/prisma';
import { AgentOrchestrator } from '../../agent/AgentOrchestrator';
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/env';

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn(),
    Type: { OBJECT: 'OBJECT', STRING: 'STRING' }
  };
});

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockCreate: jest.Mock;

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCreate = jest.fn();
    (GoogleGenAI as jest.Mock).mockImplementation(() => {
      return {
        interactions: {
          create: mockCreate
        }
      };
    });
    
    // Set a dummy API key to avoid initialization error
    config.gemini.apiKey = 'test-key';
    
    orchestrator = new AgentOrchestrator(prisma);
  });

  it('should handle a valid read-only function call and complete', async () => {
    const customer = await prisma.customer.create({
      data: { name: 'Test', email: `test-${Date.now()}@example.com` }
    });
    const payment = await prisma.payment.create({
      data: { customerId: customer.id, amount: 100, status: 'FAILED' }
    });

    // Mock Gemini responding with a function call on first turn
    mockCreate.mockResolvedValueOnce({
      id: 'inter-1',
      outputs: [{
        type: 'function_call',
        name: 'get_payment_context',
        id: 'call-1',
        arguments: { paymentId: payment.id }
      }]
    });

    // Mock Gemini responding with text on second turn (after receiving function result)
    mockCreate.mockResolvedValueOnce({
      id: 'inter-2',
      outputs: [{
        type: 'text',
        text: 'The payment failed.'
      }]
    });

    const result = await orchestrator.run(payment.id);

    expect(result.status).toBe('COMPLETED');
    expect(result.outcome).toBe('The payment failed.');
    expect(result.actionsTaken).toContain('get_payment_context');
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // Verify AgentRun and AgentAction were persisted
    const run = await prisma.agentRun.findUnique({ where: { id: result.runId }, include: { agentActions: true } });
    expect(run?.status).toBe('COMPLETED');
    expect(run?.agentActions).toHaveLength(1);
    expect(run?.agentActions[0].toolName).toBe('get_payment_context');
    expect(run?.agentActions[0].actionType).toBe('READ_ONLY');
  });

  it('should block consequential action via PolicyEngine and allow Gemini to continue', async () => {
    const customer = await prisma.customer.create({
      data: { name: 'Test2', email: `test2-${Date.now()}@example.com` }
    });
    // Max retry count is 3 by default in schema, let's set retryCount to 3 to trigger retry Limit failure
    const payment = await prisma.payment.create({
      data: { customerId: customer.id, amount: 100, status: 'FAILED', retryCount: 3 }
    });

    // First turn: try to retry payment
    mockCreate.mockResolvedValueOnce({
      id: 'inter-1',
      outputs: [{
        type: 'function_call',
        name: 'retry_payment',
        id: 'call-1',
        arguments: { paymentId: payment.id }
      }]
    });

    // Capture what is passed back to Gemini on the second turn
    let secondTurnArgs: any;
    mockCreate.mockImplementationOnce(async (args) => {
      secondTurnArgs = args;
      return {
        id: 'inter-2',
        outputs: [{ type: 'text', text: 'I was blocked.' }]
      };
    });

    const result = await orchestrator.run(payment.id);

    expect(result.status).toBe('COMPLETED');
    expect(result.actionsBlocked).toContain('retry_payment');
    
    // Verify it sent a blocked result back to Gemini
    expect(secondTurnArgs.input[0].type).toBe('function_result');
    expect(secondTurnArgs.input[0].result.blocked).toBe(true);
    
    // Verify action was persisted as blocked
    const run = await prisma.agentRun.findUnique({ where: { id: result.runId }, include: { agentActions: true } });
    expect(run?.agentActions).toHaveLength(1);
    expect(run?.agentActions[0].executionStatus).toBe('BLOCKED');
  });

  it('should reject unknown functions', async () => {
    const customer = await prisma.customer.create({
      data: { name: 'Test3', email: `test3-${Date.now()}@example.com` }
    });
    const payment = await prisma.payment.create({
      data: { customerId: customer.id, amount: 100, status: 'FAILED' }
    });

    // Mock Gemini inventing a function
    mockCreate.mockResolvedValueOnce({
      id: 'inter-1',
      outputs: [{
        type: 'function_call',
        name: 'invented_function',
        id: 'call-1',
        arguments: {}
      }]
    });

    mockCreate.mockResolvedValueOnce({
      id: 'inter-2',
      outputs: [{ type: 'text', text: 'Oops.' }]
    });

    const result = await orchestrator.run(payment.id);

    expect(result.actionsTaken).not.toContain('invented_function');
    const run = await prisma.agentRun.findUnique({ where: { id: result.runId }, include: { agentActions: true } });
    
    expect(run?.agentActions[0].executionStatus).toBe('FAILED');
    expect(run?.agentActions[0].resultSummary).toContain('Unknown function invented_function');
  });

  it('should stop after iteration limit', async () => {
    const customer = await prisma.customer.create({
      data: { name: 'Test4', email: `test4-${Date.now()}@example.com` }
    });
    const payment = await prisma.payment.create({
      data: { customerId: customer.id, amount: 100, status: 'FAILED' }
    });

    // Infinite loop mock
    mockCreate.mockResolvedValue({
      id: 'inter-infinite',
      outputs: [{
        type: 'function_call',
        name: 'get_payment_context',
        id: 'call-inf',
        arguments: { paymentId: payment.id }
      }]
    });

    // The orchestrator should throw after config.agent.maxIterations
    await expect(orchestrator.run(payment.id)).rejects.toThrow(/Agent exceeded maximum iterations/);
    
    const run = await prisma.agentRun.findFirst({ where: { paymentId: payment.id } });
    expect(run?.status).toBe('FAILED');
  });
});
