import { Router } from 'express';
import { getPayment, getPaymentContext, getCustomer } from '../controllers/payment.controller';

const router = Router();

router.get('/payments/:id', getPayment);
router.get('/payments/:id/context', getPaymentContext);
router.get('/customers/:id', getCustomer);

export const paymentRoutes = router;
