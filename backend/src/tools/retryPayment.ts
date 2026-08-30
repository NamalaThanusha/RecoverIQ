import { RetryPaymentInput } from './types';
import { PaymentResult } from '../types/payment';
import { PaymentService } from '../services/payment/PaymentService';
import { ToolError, ToolErrorCodes } from './errors';

export async function retryPayment(
  paymentService: PaymentService,
  input: RetryPaymentInput
): Promise<PaymentResult> {
  try {
    const result = await paymentService.retryPayment(input.paymentId);
    return result;
  } catch (error: any) {
    if (error.name === 'PaymentError') {
      // Map domain payment errors to tool errors if necessary, or just throw as ToolError
      let code = ToolErrorCodes.INVALID_PAYMENT_STATE;
      if (error.code === 'PAYMENT_NOT_FOUND') code = ToolErrorCodes.PAYMENT_NOT_FOUND;
      if (error.code === 'RETRY_LIMIT_EXCEEDED') code = ToolErrorCodes.RETRY_LIMIT_EXCEEDED;
      
      throw new ToolError(code, error.message);
    }
    throw error;
  }
}
