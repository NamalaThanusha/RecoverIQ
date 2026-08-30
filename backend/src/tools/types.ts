import { PaymentStatus } from '../types/payment';

export interface GetPaymentDetailsInput {
  paymentId: string;
}

export interface GetPaymentDetailsOutput {
  paymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus | string;
  failureReason: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  customerId: string;
}

export interface GetCustomerHistoryInput {
  customerId: string;
}

export interface CustomerMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalHistoricalValue: number;
  successfulValue: number;
  successRate: number;
}

export interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export interface GetCustomerHistoryOutput {
  customer: {
    id: string;
    name: string;
    segment: string | null;
  };
  metrics: CustomerMetrics;
  recentPayments: RecentPayment[];
}

export interface CalculateRecoveryContextInput {
  paymentId: string;
}

export interface CalculateRecoveryContextOutput {
  paymentAmount: number;
  customerLTV: number;
  successRate: number;
  previousFailureCount: number;
  retryCount: number;
  isRetryable: boolean;
  isHighValue: boolean;
  recoveryAttemptedPreviously: boolean;
}

export interface RetryPaymentInput {
  paymentId: string;
}

export interface SendPaymentReminderInput {
  paymentId: string;
  templateId: string;
}

export interface SendPaymentReminderOutput {
  reminderId: string;
  paymentId: string;
  channel: string;
  status: string;
  timestamp: Date;
}

export interface OfferRecoveryIncentiveInput {
  paymentId: string;
  offerId: string;
}

export interface OfferRecoveryIncentiveOutput {
  incentiveId: string;
  paymentId: string;
  offerId: string;
  discountPercent: number;
  proposedAmount: number;
  status: 'PROPOSED';
}

export interface EscalateCaseInput {
  paymentId: string;
  reason: string;
}

export interface EscalateCaseOutput {
  approvalRequestId: string;
  paymentId: string;
  status: 'PENDING';
  reason: string;
  timestamp: Date;
}

export interface VerifyPaymentStatusInput {
  paymentId: string;
}
