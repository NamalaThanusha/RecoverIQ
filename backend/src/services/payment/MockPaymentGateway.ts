import { PaymentGateway, PaymentResult, PaymentStatus, PaymentError, PaymentErrorCodes } from '../../types/payment';

export enum Scenario {
  A = 'A', // FAILED -> SUCCESS on retry 1
  B = 'B', // FAILED -> FAILED -> SUCCESS on retry 2
  C = 'C', // FAILED -> FAILED -> FAILED -> exhausted
  D = 'D', // SUCCESS -> retry rejected
}

export interface MockGatewayConfig {
  scenarios: Record<string, Scenario>;
}

export class MockPaymentGateway implements PaymentGateway {
  constructor(private config: MockGatewayConfig) {}

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    const scenario = this.config.scenarios[paymentId];
    if (!scenario) {
      throw new PaymentError(PaymentErrorCodes.PAYMENT_NOT_FOUND, `Payment ${paymentId} not found in mock gateway`);
    }

    let status = PaymentStatus.FAILED;
    if (scenario === Scenario.D) {
      status = PaymentStatus.SUCCESS;
    }

    return {
      paymentId,
      previousStatus: status,
      newStatus: status,
      attemptNumber: 0,
      success: status === PaymentStatus.SUCCESS,
      timestamp: new Date(),
    };
  }

  async retryPayment(paymentId: string, currentAttempt: number): Promise<PaymentResult> {
    const scenario = this.config.scenarios[paymentId];
    if (!scenario) {
      throw new PaymentError(PaymentErrorCodes.PAYMENT_NOT_FOUND, `Payment ${paymentId} not found in mock gateway`);
    }

    let newStatus = PaymentStatus.FAILED;
    let success = false;
    let reason = 'Payment retry failed in mock gateway';

    switch (scenario) {
      case Scenario.A:
        if (currentAttempt >= 1) {
          newStatus = PaymentStatus.SUCCESS;
          success = true;
          reason = 'Payment successful on retry';
        }
        break;
      case Scenario.B:
        if (currentAttempt >= 2) {
          newStatus = PaymentStatus.SUCCESS;
          success = true;
          reason = 'Payment successful on retry';
        }
        break;
      case Scenario.C:
        // Always fails
        newStatus = PaymentStatus.FAILED;
        success = false;
        reason = 'Payment retry failed';
        break;
      case Scenario.D:
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_ALREADY_SUCCESSFUL,
          `Payment ${paymentId} is already successful`
        );
    }

    return {
      paymentId,
      previousStatus: PaymentStatus.FAILED,
      newStatus,
      attemptNumber: currentAttempt,
      success,
      reason,
      timestamp: new Date(),
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    // In this mock, verify behaves identically to getPaymentStatus conceptually,
    // though in a real gateway this might sync the state.
    return this.getPaymentStatus(paymentId);
  }
}
