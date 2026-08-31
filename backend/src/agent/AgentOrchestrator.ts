import { PrismaClient } from '@prisma/client';
import { GeminiClient } from './GeminiClient';
import { agentFunctions, consequentialActions } from './toolRegistry';
import { AgentError, AgentErrorCode } from './errors';
import { PolicyEngine } from '../policy/PolicyEngine';
import { config } from '../config/env';
import { AgentRunResult } from './types';
import { PaymentService } from '../services/payment/PaymentService';
import { MockPaymentGateway } from '../services/payment/MockPaymentGateway';

export class AgentOrchestrator {
  private prisma: PrismaClient;
  private gemini: GeminiClient;
  private policyEngine: PolicyEngine;
  private paymentService: PaymentService;
  private maxIterations = config.agent.maxIterations;

  constructor(prisma: PrismaClient, gatewayScenarios?: Record<string, any>) {
    this.prisma = prisma;
    this.gemini = new GeminiClient();
    this.policyEngine = new PolicyEngine();
    this.paymentService = new PaymentService(prisma, new MockPaymentGateway({ scenarios: gatewayScenarios || {} }));
  }

  private async logAudit(paymentId: string, agentRunId: string, eventType: string, message: string) {
    await this.prisma.auditLog.create({
      data: {
        paymentId,
        agentRunId,
        eventType,
        message
      }
    });
  }

  public async run(paymentId: string): Promise<AgentRunResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error("Payment " + paymentId + " not found.");
    }

    const agentRun = await this.prisma.agentRun.create({
      data: {
        paymentId,
        status: 'RUNNING'
      }
    });

    await this.logAudit(paymentId, agentRun.id, 'AGENT_RUN_STARTED', 'Agent run started');

    let iterations = 0;
    let interaction: any = await this.gemini.startInteraction(paymentId);
    let finalOutcome = null;

    try {
      while (iterations < this.maxIterations) {
        iterations++;
        
        const outputs = interaction.outputs || [];
        const functionCalls = outputs.filter((o: any) => o.type === 'function_call');
        
        if (functionCalls.length === 0) {
          const textOutputs = outputs.filter((o: any) => o.type === 'text');
          if (textOutputs.length > 0) {
            finalOutcome = textOutputs.map((o: any) => o.text).join('\\n');
          } else {
            finalOutcome = 'Agent completed with no text response.';
          }
          break; 
        }

        const functionResults = [];

        for (const call of functionCalls) {
          const fnName = call.name;
          const fnArgs = call.arguments;
          
          let resultData;
          let blocked = false;
          let policyDecisionDetails = null;
          let executionStatus = 'SUCCESS';
          const isConsequential = consequentialActions.has(fnName);

          try {
            if (!(fnName in agentFunctions)) {
              throw new AgentError(AgentErrorCode.UNKNOWN_FUNCTION, "Unknown function " + fnName);
            }

            let allowed = true;

            if (isConsequential) {
              let decision;
              
              const merchantPolicy = await this.prisma.merchantPolicy.findFirst({
                where: { active: true }
              }) || {
                maxRetryAttempts: 3,
                maxDiscountPercent: 10,
                minimumConfidence: 0.7,
                highValueThreshold: 100,
                highValueApprovalRequired: true,
                active: true
              };
              
              const customer = await this.prisma.customer.findUnique({
                where: { id: payment.customerId }
              });

              if (fnName === 'retry_payment') {
                decision = this.policyEngine.evaluateRetry({ payment, merchantPolicy });
              } else if (fnName === 'offer_recovery_incentive') {
                const offer = await this.prisma.recoveryOffer.findUnique({ where: { id: fnArgs.offerId } });
                decision = this.policyEngine.evaluateIncentive({ payment, merchantPolicy, offer });
              } else if (fnName === 'send_payment_reminder') {
                decision = this.policyEngine.evaluateReminder({ payment });
              } else if (fnName === 'escalate_case') {
                decision = this.policyEngine.evaluateEscalation({ payment, merchantPolicy, customer: customer || { lifetimeValue: 0 } });
              }
              
              if (decision) {
                policyDecisionDetails = decision;
                if (!decision.allowed) {
                  allowed = false;
                  blocked = true;
                  executionStatus = 'BLOCKED';
                  resultData = {
                    success: false,
                    blocked: true,
                    action: fnName,
                    reason: decision.reason,
                    ruleResults: decision.ruleResults
                  };
                  await this.logAudit(paymentId, agentRun.id, 'AGENT_ACTION_BLOCKED', "Action " + fnName + " blocked by policy: " + decision.reason);
                } else {
                  await this.logAudit(paymentId, agentRun.id, 'AGENT_ACTION_ALLOWED', "Action " + fnName + " allowed by policy.");
                }
              }
            }

            if (allowed) {
              await this.logAudit(paymentId, agentRun.id, 'AGENT_TOOL_REQUESTED', "Tool " + fnName + " requested.");
              const toolFn = (agentFunctions as any)[fnName];
              if (fnName === 'retry_payment' || fnName === 'verify_payment_status') {
                resultData = await toolFn(this.paymentService, fnArgs);
              } else {
                resultData = await toolFn(this.prisma, fnArgs);
              }
              await this.logAudit(paymentId, agentRun.id, 'AGENT_ACTION_EXECUTED', "Tool " + fnName + " executed successfully.");
              if (fnName === 'verify_payment_status') {
                 await this.logAudit(paymentId, agentRun.id, 'AGENT_RECOVERY_VERIFIED', "Payment status verified: " + resultData.status);
              }
            }

          } catch (error: any) {
            executionStatus = 'FAILED';
            resultData = {
              success: false,
              error: error.message || 'Unknown error occurred during tool execution'
            };
            await this.logAudit(paymentId, agentRun.id, 'AGENT_ACTION_FAILED', "Tool " + fnName + " failed: " + resultData.error);
          }

          await this.prisma.agentAction.create({
            data: {
              agentRunId: agentRun.id,
              actionType: isConsequential ? 'CONSEQUENTIAL' : 'READ_ONLY',
              toolName: fnName,
              inputParams: fnArgs || {},
              policyDecision: policyDecisionDetails ? JSON.stringify(policyDecisionDetails) : null,
              executionStatus,
              resultSummary: JSON.stringify(resultData).substring(0, 500),
              stepNumber: iterations
            }
          });

          functionResults.push({
            type: 'function_result',
            name: fnName,
            call_id: call.id,
            result: resultData
          });
        }

        interaction = await this.gemini.continueInteraction(interaction.id, functionResults);
      }

      if (iterations >= this.maxIterations) {
        throw new AgentError(AgentErrorCode.ITERATION_LIMIT_EXCEEDED, "Agent exceeded maximum iterations (" + this.maxIterations + ")");
      }

      const updatedPayment = await this.prisma.payment.findUnique({
        where: { id: paymentId }
      });
      const isRecovered = updatedPayment?.status === 'SUCCESS';

      await this.prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          currentStepCount: iterations,
          finalOutcome: finalOutcome || 'Completed',
          decisionSummary: finalOutcome ? finalOutcome.substring(0, 200) : null,
        }
      });
      
      await this.logAudit(paymentId, agentRun.id, 'AGENT_RUN_COMPLETED', 'Agent run completed successfully');

      const actions = await this.prisma.agentAction.findMany({ where: { agentRunId: agentRun.id }, orderBy: { stepNumber: 'asc' } });
      
      return {
        runId: agentRun.id,
        paymentId,
        status: 'COMPLETED',
        outcome: finalOutcome,
        recovered: isRecovered,
        recoveredAmount: isRecovered ? (updatedPayment?.amount || 0) : null,
        finalPaymentStatus: updatedPayment?.status || 'UNKNOWN',
        actionsTaken: actions.filter(a => a.executionStatus === 'SUCCESS').map(a => a.toolName),
        actionsBlocked: actions.filter(a => a.executionStatus === 'BLOCKED').map(a => a.toolName),
        iterations,
        explanation: finalOutcome
      };

    } catch (error: any) {
      await this.prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          currentStepCount: iterations,
          finalOutcome: error.message
        }
      });
      
      await this.logAudit(paymentId, agentRun.id, 'AGENT_RUN_FAILED', "Agent run failed: " + error.message);
      throw error;
    }
  }
}
