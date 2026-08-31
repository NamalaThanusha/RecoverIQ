import { GoogleGenAI } from '@google/genai';
import { AgentError, AgentErrorCode } from './errors';
import { toolDeclarations } from './toolRegistry';
import { AGENT_SYSTEM_INSTRUCTION } from './prompts';
import { config } from '../config/env';

export class GeminiClient {
  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      throw new AgentError(AgentErrorCode.MISSING_API_KEY, 'GEMINI_API_KEY environment variable is missing');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = config.gemini.model;
  }

  public async startInteraction(paymentId: string) {
    try {
      const interaction = await this.ai.interactions.create({
        model: this.model,
        tools: toolDeclarations.map(t => ({ type: 'function', ...t })),
        input: AGENT_SYSTEM_INSTRUCTION + "\n\nPlease analyze and attempt recovery for payment ID: " + paymentId
      } as any);
      return interaction;
    } catch (error: any) {
      throw new AgentError(AgentErrorCode.API_FAILURE, "Failed to start interaction: " + error.message, error);
    }
  }

  public async continueInteraction(previousInteractionId: string, input: any[]) {
    try {
      const interaction = await this.ai.interactions.create({
        model: this.model,
        previous_interaction_id: previousInteractionId,
        input
      } as any);
      return interaction;
    } catch (error: any) {
      throw new AgentError(AgentErrorCode.API_FAILURE, "Failed to continue interaction: " + error.message, error);
    }
  }
}
