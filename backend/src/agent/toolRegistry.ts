import { getPaymentDetails, getCustomerHistory, calculateRecoveryContext, retryPayment, sendPaymentReminder, offerRecoveryIncentive, escalateCase, verifyPaymentStatus } from '../tools';
import { Type } from '@google/genai';

export const agentFunctions = {
  get_payment_context: getPaymentDetails,
  get_customer_history: getCustomerHistory,
  calculate_recovery_context: calculateRecoveryContext,
  retry_payment: retryPayment,
  send_payment_reminder: sendPaymentReminder,
  offer_recovery_incentive: offerRecoveryIncentive,
  escalate_case: escalateCase,
  verify_payment_status: verifyPaymentStatus
};

export const consequentialActions = new Set([
  'retry_payment',
  'send_payment_reminder',
  'offer_recovery_incentive',
  'escalate_case'
]);

export const toolDeclarations = [
  {
    name: "get_payment_context",
    description: "Retrieves the full context for a failed payment, including reasons, amount, status, and timeline. Use this to understand why a payment failed.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment." }
      },
      required: ["paymentId"]
    }
  },
  {
    name: "get_customer_history",
    description: "Retrieves the customer history including past payments, lifetime value, and segment. Use this to understand customer behavior before taking action.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment (to identify the customer)." }
      },
      required: ["paymentId"]
    }
  },
  {
    name: "calculate_recovery_context",
    description: "Calculates the recovery context (such as time since failure, recommended actions based on static heuristics). Use this to gather additional context.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment." }
      },
      required: ["paymentId"]
    }
  },
  {
    name: "retry_payment",
    description: "Attempts to retry a failed payment. This is a consequential action that will be evaluated by the PolicyEngine. You MUST verify the payment status after calling this tool.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment to retry." }
      },
      required: ["paymentId"]
    }
  },
  {
    name: "send_payment_reminder",
    description: "Sends a payment reminder to the customer. This is a consequential action evaluated by the PolicyEngine. Use this if the payment failed and the customer needs a nudge.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment." },
        channel: { type: Type.STRING, description: "The channel to send the reminder on (e.g. EMAIL, SMS)." }
      },
      required: ["paymentId", "channel"]
    }
  },
  {
    name: "offer_recovery_incentive",
    description: "Offers a recovery incentive (discount) to the customer to encourage payment. This is a consequential action evaluated by the PolicyEngine.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment." },
        offerId: { type: Type.STRING, description: "The ID of the discount offer to apply." }
      },
      required: ["paymentId", "offerId"]
    }
  },
  {
    name: "escalate_case",
    description: "Escalates the case for human review if deterministic conditions require it or if no other automated recovery path remains. This is a consequential action evaluated by the PolicyEngine.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment." },
        reason: { type: Type.STRING, description: "The reason for escalation." }
      },
      required: ["paymentId", "reason"]
    }
  },
  {
    name: "verify_payment_status",
    description: "Verifies the current status of the payment with the payment gateway. Use this to confirm if a payment succeeded after a retry or other action.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        paymentId: { type: Type.STRING, description: "The unique ID of the payment." }
      },
      required: ["paymentId"]
    }
  }
];
