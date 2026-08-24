# RecoverIQ

RecoverIQ is an AI-powered revenue recovery platform designed to detect failed payments and autonomously attempt to recover the revenue using deterministic guardrails and LLM function calling.

## Technology Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase PostgreSQL, Prisma ORM
- **AI**: Gemini API (`@google/genai`)

## Current Development Phase
- **Phase 0**: Project foundation (Frontend and Backend shell, basic configuration, health check)

## Local Development Instructions
1. Install dependencies in the root folder: `npm install`
2. Create a `.env` file based on `.env.example` in the root.
3. Start the backend server: `npm run dev:backend`
4. Start the frontend application: `npm run dev:frontend`
5. Run backend tests: `npm run test:backend`