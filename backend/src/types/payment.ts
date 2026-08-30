export enum PaymentStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
  REQUIRES_ACTION = 'REQUIRES_ACTION'
}

export interface PaymentResult {
  paymentId: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  attemptNumber: number;
  success: boolean;
  reason?: string;
  timestamp: Date;
}

export interface PaymentGateway {
  getPaymentStatus(paymentId: string): Promise<PaymentResult>;
  retryPayment(paymentId: string, currentAttempt: number): Promise<PaymentResult>;
  verifyPayment(paymentId: string): Promise<PaymentResult>;
}

export class PaymentError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export const PaymentErrorCodes = {
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  INVALID_PAYMENT_STATE: 'INVALID_PAYMENT_STATE',
  RETRY_LIMIT_EXCEEDED: 'RETRY_LIMIT_EXCEEDED',
  PAYMENT_ALREADY_SUCCESSFUL: 'PAYMENT_ALREADY_SUCCESSFUL',
  PAYMENT_REQUIRES_ACTION: 'PAYMENT_REQUIRES_ACTION'
};
