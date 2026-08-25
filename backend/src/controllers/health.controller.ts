import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const checkHealth = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'recoveriq-api'
  });
};

export const checkDbHealth = async (req: Request, res: Response) => {
  try {
    // Trivial query to ensure DB is responsive
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      service: 'recoveriq-db'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'recoveriq-db',
      error: 'Database connection failed'
    });
  }
};
