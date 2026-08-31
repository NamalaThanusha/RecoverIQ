import dotenv from 'dotenv';
dotenv.config(); // Loads .env from current working directory (backend)

export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  },
  agent: {
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '8', 10),
  }
};
