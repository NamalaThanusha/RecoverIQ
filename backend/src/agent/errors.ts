export enum AgentErrorCode {
  MISSING_API_KEY = 'MISSING_API_KEY',
  API_FAILURE = 'API_FAILURE',
  INVALID_FUNCTION_CALL = 'INVALID_FUNCTION_CALL',
  UNKNOWN_FUNCTION = 'UNKNOWN_FUNCTION',
  MALFORMED_ARGUMENTS = 'MALFORMED_ARGUMENTS',
  ITERATION_LIMIT_EXCEEDED = 'ITERATION_LIMIT_EXCEEDED'
}

export class AgentError extends Error {
  constructor(public code: AgentErrorCode, message: string, public details?: any) {
    super(message);
    this.name = 'AgentError';
  }
}
