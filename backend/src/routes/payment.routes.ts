import { Router } from 'express';
import { getPayment, getPaymentContext, getCustomer, getPayments } from '../controllers/payment.controller';

const router = Router();

router.get('/payments', getPayments);
router.get('/payments/:id', getPayment);
router.get('/payments/:id/context', getPaymentContext);
router.get('/customers/:id', getCustomer);

export const paymentRoutes = router;
