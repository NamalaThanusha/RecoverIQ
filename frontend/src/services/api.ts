const API_BASE = '/api';

export interface Customer {
  id: string;
  name: string;
  email: string;
  segment?: string;
  lifetimeValue: number;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'FAILED' | 'SUCCESS' | 'REQUIRES_ACTION';
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentWithCustomer extends Payment {
  customer: Customer;
}

export interface PaymentDetail extends PaymentWithCustomer {
  agentRuns: AgentRun[];
}

export interface AgentRun {
  id: string;
  paymentId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  currentStepCount: number;
  finalOutcome?: string;
  decisionSummary?: string;
  confidence?: number;
}

export interface AgentAction {
  id: string;
  agentRunId: string;
  actionType: string;
  toolName: string;
  inputParams?: any;
  policyDecision?: string;
  executionStatus: string;
  resultSummary?: string;
  stepNumber: number;
  timestamps?: any;
}

export interface AgentRunTimeline extends AgentRun {
  agentActions: AgentAction[];
  auditLogs: any[];
}

export interface ApprovalRequest {
  id: string;
  paymentId: string;
  agentRunId?: string;
  proposedAction: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  payment: PaymentWithCustomer;
}

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
  timestamp: string;
}

export interface RecoveryContext {
  paymentAmount: number;
  customerLTV: number;
  customerSuccessRate: number;
  previousFailureCount: number;
  retryCount: number;
  isRetryable: boolean;
  isHighValue: boolean;
  recoveryAttemptedPreviously: boolean;
}

class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errCode = 'API_ERROR';
    let errMsg = 'An unexpected error occurred';
    try {
      const body = await res.json();
      if (body.error) {
        errCode = body.error.code;
        errMsg = body.error.message;
      }
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new ApiError(errCode, errMsg);
  }

  return res.json();
}

export const api = {
  getPayments: (status?: string) => {
    const qs = status && status !== 'All' ? `?status=${status}` : '';
    return fetchApi<PaymentWithCustomer[]>(`/payments${qs}`);
  },
  getPayment: (id: string) => fetchApi<PaymentDetail>(`/payments/${id}`),
  getPaymentContext: (id: string) => fetchApi<RecoveryContext>(`/payments/${id}/context`),
  getEscalations: () => fetchApi<ApprovalRequest[]>('/agent/escalations'),
  getAgentRun: (id: string) => fetchApi<AgentRunTimeline>(`/agent/runs/${id}`),
  getEvaluationResults: () => fetchApi<EvaluationResult>('/evaluation/results'),
  runEvaluation: () => fetchApi<EvaluationResult>('/evaluation/run', { method: 'POST' }),
  triggerAgent: (paymentId: string) => fetchApi<any>('/agent/runs', {
    method: 'POST',
    body: JSON.stringify({ paymentId })
  })
};
