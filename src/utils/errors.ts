// Error handling utilities for MCP server

export class HevyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'HevyAPIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function handleToolError(error: unknown): string {
  if (error instanceof HevyAPIError) {
    return `Hevy API Error: ${error.message}${
      error.statusCode ? ` (Status: ${error.statusCode})` : ''
    }`;
  }

  if (error instanceof ValidationError) {
    return `Validation Error: ${error.message}${
      error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
    }`;
  }

  if (error instanceof ConfigurationError) {
    return `Configuration Error: ${error.message}`;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Unknown error: ${String(error)}`;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    );
  }
  return false;
}
