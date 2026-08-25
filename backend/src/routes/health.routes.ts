import { Router } from 'express';
import { checkHealth, checkDbHealth } from '../controllers/health.controller';

const router = Router();

router.get('/health', checkHealth);
router.get('/health/db', checkDbHealth);

export { router as healthRouter };
