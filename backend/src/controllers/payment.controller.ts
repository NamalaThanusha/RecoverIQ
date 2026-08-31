import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getPaymentDetails, calculateRecoveryContext, getCustomerHistory } from '../tools';

export async function getPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payment = await getPaymentDetails(prisma, { paymentId: id });
    if (!payment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    }
    return res.status(200).json(payment);
  } catch (err: any) {
    if (err.code === 'PAYMENT_NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}

export async function getPaymentContext(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const context = await calculateRecoveryContext(prisma, { paymentId: id });
    return res.status(200).json(context);
  } catch (err: any) {
    if (err.code === 'PAYMENT_NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}

export async function getCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const customerHistory = await getCustomerHistory(prisma, { customerId: id });
    return res.status(200).json(customerHistory);
  } catch (err: any) {
    if (err.code === 'PAYMENT_NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    if (err.code === 'CUSTOMER_NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}
