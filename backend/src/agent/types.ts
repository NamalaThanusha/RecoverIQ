import { Tool } from '@google/genai';

export interface AgentRunContext {
  paymentId: string;
}

export interface AgentRunResult {
  runId: string;
  paymentId: string;
  status: string;
  outcome: string | null;
  recovered: boolean;
  recoveredAmount: number | null;
  finalPaymentStatus: string;
  actionsTaken: any[];
  actionsBlocked: any[];
  iterations: number;
  explanation: string | null;
}

export type FunctionDeclaration = Tool;
