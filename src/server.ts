import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { HevyClient } from './hevy/client.js';
import { registerWorkoutTools } from './tools/workouts.js';
import { registerRoutineTools } from './tools/routines.js';
import { registerExerciseTools } from './tools/exercises.js';
import { registerFolderTools } from './tools/folders.js';
import { ConfigurationError } from './utils/errors.js';

export interface ServerConfig {
  apiKey: string;
  apiBaseUrl?: string;
}

export function createHevyMCPServer(config: ServerConfig): Server {
  // Validate configuration
  if (!config.apiKey) {
    throw new ConfigurationError('HEVY_API_KEY is required');
  }

  // Initialize Hevy API client
  const hevyClient = new HevyClient({
    apiKey: config.apiKey,
    baseUrl: config.apiBaseUrl || 'https://api.hevyapp.com',
  });

  // Create MCP server
  const server = new Server(
    {
      name: 'hevy-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tool groups
  // Note: Each tool registration adds tools to the server's tool list
  registerWorkoutTools(server, hevyClient);
  registerRoutineTools(server, hevyClient);
  registerExerciseTools(server, hevyClient);
  registerFolderTools(server, hevyClient);

  return server;
}
