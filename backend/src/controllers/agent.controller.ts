import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function getAgentRunTimeline(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const agentRun = await prisma.agentRun.findUnique({
      where: { id },
      include: {
        agentActions: { orderBy: { stepNumber: 'asc' } },
        auditLogs: { orderBy: { timestamp: 'asc' } }
      }
    });
    
    if (!agentRun) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent run not found' } });
    }
    
    return res.status(200).json(agentRun);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}

export async function getEscalations(req: Request, res: Response) {
  try {
    const escalations = await prisma.approvalRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        payment: {
          include: { customer: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
    
    return res.status(200).json(escalations);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
}
