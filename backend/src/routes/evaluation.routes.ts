import { Router } from 'express';
import { runEvaluation, getEvaluationResults } from '../controllers/evaluation.controller';

const router = Router();

router.post('/run', runEvaluation);
router.get('/results', getEvaluationResults);

export const evaluationRoutes = router;
