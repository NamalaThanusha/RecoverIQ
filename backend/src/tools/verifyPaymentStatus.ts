import { VerifyPaymentStatusInput } from './types';
import { PaymentResult } from '../types/payment';
import { PaymentService } from '../services/payment/PaymentService';
import { ToolError, ToolErrorCodes } from './errors';

export async function verifyPaymentStatus(
  paymentService: PaymentService,
  input: VerifyPaymentStatusInput
): Promise<PaymentResult> {
  try {
    const result = await paymentService.verifyPayment(input.paymentId);
    return result;
  } catch (error: any) {
    if (error.name === 'PaymentError') {
      let code = ToolErrorCodes.INVALID_PAYMENT_STATE;
      if (error.code === 'PAYMENT_NOT_FOUND') code = ToolErrorCodes.PAYMENT_NOT_FOUND;
      
      throw new ToolError(code, error.message);
    }
    throw error;
  }
}
