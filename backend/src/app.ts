import express from 'express';
import { healthRouter } from './routes/health.routes';

const app = express();

app.use(express.json());

// Routes
app.use('/api', healthRouter);

export default app;
