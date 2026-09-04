import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getPaymentDetails, calculateRecoveryContext, getCustomerHistory } from '../tools';

export async function getPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        agentRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    if (!payment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    }
    return res.status(200).json(payment);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}

export async function getPayments(req: Request, res: Response) {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.status(200).json(payments);
  } catch (err: any) {
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
