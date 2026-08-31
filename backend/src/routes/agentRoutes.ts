import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AgentOrchestrator } from '../agent';
import { getAgentRunTimeline, getEscalations } from '../controllers/agent.controller';

export function getAgentRoutes(prisma: PrismaClient) {
  const router = Router();
  const orchestrator = new AgentOrchestrator(prisma);

  router.post('/runs', async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'paymentId is required' } });
      }

      const result = await orchestrator.run(paymentId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Agent run failed:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message || 'An error occurred during the agent run.' }
      });
    }
  });

  router.get('/runs/:id', getAgentRunTimeline);
  router.get('/escalations', getEscalations);

  return router;
}
