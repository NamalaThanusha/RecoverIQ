import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Evaluator } from '../evaluation/Evaluator';

export async function runEvaluation(req: Request, res: Response) {
  try {
    const evaluator = new Evaluator(prisma);
    const result = await evaluator.runEvaluation();
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Evaluation run failed:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}

export async function getEvaluationResults(req: Request, res: Response) {
  try {
    if (Evaluator.latestResult) {
      return res.status(200).json(Evaluator.latestResult);
    }
    // Return empty state or 404 if no evaluation has been run
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No evaluation results available yet. Run an evaluation first.' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}
