import { PrismaClient, Payment, PaymentStatus } from '@prisma/client';
import { AgentOrchestrator } from '../agent/AgentOrchestrator';
import { EvaluationResult } from './types';
import { toMinorUnits } from '../utils/money';
import { Scenario } from '../services/payment/MockPaymentGateway';

export class Evaluator {
  private prisma: PrismaClient;
  
  // Keep latest result in memory
  public static latestResult: EvaluationResult | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async runEvaluation(): Promise<EvaluationResult> {
    // 1. Identify deterministic fixture payments
    const failedPayments = await this.prisma.payment.findMany({
      where: { status: 'FAILED' },
      take: 6,
      orderBy: { createdAt: 'asc' }
    });

    const successPayments = await this.prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      take: 1,
      orderBy: { createdAt: 'asc' }
    });

    if (failedPayments.length < 6 || successPayments.length < 1) {
      throw new Error('Not enough seeded data for deterministic evaluation fixtures.');
    }

    const fixtures = [
      { payment: failedPayments[0], scenarioName: 'A', scenario: Scenario.A },
      { payment: failedPayments[1], scenarioName: 'A', scenario: Scenario.A },
      { payment: failedPayments[2], scenarioName: 'B', scenario: Scenario.B },
      { payment: failedPayments[3], scenarioName: 'B', scenario: Scenario.B },
      { payment: failedPayments[4], scenarioName: 'C', scenario: Scenario.C },
      { payment: failedPayments[5], scenarioName: 'C', scenario: Scenario.C },
      { payment: successPayments[0], scenarioName: 'D', scenario: Scenario.D }
    ];

    // 2. Reset fixtures to their deterministic baseline
    for (const fx of fixtures) {
      await this.resetFixture(fx.payment, fx.scenarioName);
    }

    // 3. Setup gateway scenarios for orchestrator
    const gatewayScenarios: Record<string, Scenario> = {};
    for (const fx of fixtures) {
      gatewayScenarios[fx.payment.id] = fx.scenario;
    }

    // Initialize orchestrator with targeted scenarios
    const orchestrator = new AgentOrchestrator(this.prisma, gatewayScenarios);

    let totalRevenueAtRiskMinor = 0;
    let recoveredRevenueMinor = 0;
    let unrecoveredRevenueMinor = 0;
    
    let recoverySuccessCount = 0;
    let recoveryFailureCount = 0;

    let retryAttempts = 0;
    let remindersSent = 0;
    let incentivesProposed = 0;
    let escalations = 0;
    let policyBlocks = 0;

    let successfulAgentRuns = 0;
    let failedAgentRuns = 0;

    const scenarioResults: Record<string, any> = {};
    for (const s of ['A', 'B', 'C', 'D']) {
      scenarioResults[s] = { count: 0, recoveredCount: 0, revenueRecoveredMinor: 0 };
    }

    // 4. Run agent on each fixture sequentially (to respect rate limits)
    let isFirstFixture = true;
    for (const fx of fixtures) {
      if (!isFirstFixture) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      isFirstFixture = false;

      const pAmountMinor = toMinorUnits(fx.payment.amount);
      totalRevenueAtRiskMinor += pAmountMinor;
      scenarioResults[fx.scenarioName].count++;

      try {
        const runResult = await orchestrator.run(fx.payment.id);
        
        if (runResult.status === 'COMPLETED') {
          successfulAgentRuns++;
        } else {
          failedAgentRuns++;
        }

        // Fetch the verified final state of the payment
        const finalPayment = await this.prisma.payment.findUnique({
          where: { id: fx.payment.id }
        });

        if (finalPayment && finalPayment.status === 'SUCCESS' && fx.scenarioName !== 'D') {
          // It was recovered! (Scenario D was already SUCCESS so it doesn't count as 'recovered' in this context, 
          // or we can count it if we want, but logically revenueAtRisk is only for FAILED payments. 
          // Wait, D is technically at risk if it gets corrupted.
          // Let's only add to recovered if it was previously FAILED.
          recoverySuccessCount++;
          recoveredRevenueMinor += pAmountMinor;
          scenarioResults[fx.scenarioName].recoveredCount++;
          scenarioResults[fx.scenarioName].revenueRecoveredMinor += pAmountMinor;
        } else if (finalPayment && finalPayment.status !== 'SUCCESS') {
          recoveryFailureCount++;
          unrecoveredRevenueMinor += pAmountMinor;
        }

        // Aggregation of actions
        const actions = await this.prisma.agentAction.findMany({
          where: { agentRunId: runResult.runId }
        });

        for (const a of actions) {
          if (a.toolName === 'retry_payment' && a.executionStatus === 'SUCCESS') retryAttempts++;
          if (a.toolName === 'send_payment_reminder' && a.executionStatus === 'SUCCESS') remindersSent++;
          if (a.toolName === 'offer_recovery_incentive' && a.executionStatus === 'SUCCESS') incentivesProposed++;
          if (a.toolName === 'escalate_case' && a.executionStatus === 'SUCCESS') escalations++;
          if (a.executionStatus === 'BLOCKED') policyBlocks++;
        }

      } catch (err: any) {
        failedAgentRuns++;
        recoveryFailureCount++;
        unrecoveredRevenueMinor += pAmountMinor;
      }
    }

    const totalRuns = successfulAgentRuns + failedAgentRuns;
    // Calculate Rates based strictly on FAILED payments (the 6 payments)
    const totalFailedEval = 6;
    
    const result: EvaluationResult = {
      totalPaymentsEvaluated: fixtures.length,
      failedPaymentsEvaluated: totalFailedEval,
      totalRevenueAtRiskMinor,
      recoveredRevenueMinor,
      unrecoveredRevenueMinor,
      recoveryRateByCount: totalFailedEval > 0 ? (recoverySuccessCount / totalFailedEval) : 0,
      recoveryRateByRevenue: (totalRevenueAtRiskMinor - toMinorUnits(successPayments[0].amount)) > 0 ? (recoveredRevenueMinor / (totalRevenueAtRiskMinor - toMinorUnits(successPayments[0].amount))) : 0,
      recoverySuccessCount,
      recoveryFailureCount,
      retryAttempts,
      remindersSent,
      incentivesProposed,
      escalations,
      policyBlocks,
      averageRecoveryAttempts: totalRuns > 0 ? retryAttempts / totalRuns : 0,
      totalAgentRuns: totalRuns,
      successfulAgentRuns,
      failedAgentRuns,
      scenarioResults,
      timestamp: new Date().toISOString()
    };

    Evaluator.latestResult = result;
    return result;
  }

  private async resetFixture(payment: Payment, scenarioName: string) {
    const status = scenarioName === 'D' ? 'SUCCESS' : 'FAILED';
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status as PaymentStatus,
        retryCount: 0,
        failureReason: scenarioName === 'D' ? null : 'Deterministic fixture reset',
        recoveredAt: null
      }
    });
  }
}
