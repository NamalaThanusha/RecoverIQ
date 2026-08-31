import express from 'express';
import { healthRouter } from './routes/health.routes';
import { getAgentRoutes } from './routes/agentRoutes';
import { prisma } from './config/prisma';

const app = express();

app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/agent', getAgentRoutes(prisma));

export default app;
