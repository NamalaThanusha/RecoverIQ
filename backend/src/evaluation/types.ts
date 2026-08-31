export interface EvaluationResult {
  totalPaymentsEvaluated: number;
  failedPaymentsEvaluated: number;
  totalRevenueAtRiskMinor: number;
  recoveredRevenueMinor: number;
  unrecoveredRevenueMinor: number;
  recoveryRateByCount: number;
  recoveryRateByRevenue: number;
  recoverySuccessCount: number;
  recoveryFailureCount: number;
  retryAttempts: number;
  remindersSent: number;
  incentivesProposed: number;
  escalations: number;
  policyBlocks: number;
  averageRecoveryAttempts: number;
  totalAgentRuns: number;
  successfulAgentRuns: number;
  failedAgentRuns: number;
  scenarioResults: Record<string, any>;
  timestamp: string;
}
