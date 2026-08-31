import express from 'express';
import { healthRouter } from './routes/health.routes';
import { getAgentRoutes } from './routes/agentRoutes';
import { prisma } from './config/prisma';

import { paymentRoutes } from './routes/payment.routes';
import { evaluationRoutes } from './routes/evaluation.routes';

const app = express();

app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/agent', getAgentRoutes(prisma));
app.use('/api', paymentRoutes);
app.use('/api/evaluation', evaluationRoutes);

export default app;
