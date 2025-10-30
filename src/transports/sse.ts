import express, { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export interface SSETransportConfig {
  port: number;
  host: string;
  ssePath: string;
  heartbeatInterval: number;
  authToken?: string;
}

/**
 * Initialize SSE transport for Poke.com
 * This transport uses Server-Sent Events for real-time communication
 */
export function createSSETransport(
  server: Server,
  config: SSETransportConfig
): express.Application {
  const app = express();

  // Enable JSON body parsing
  app.use(express.json());

  // CORS headers for remote access
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Optional authentication middleware
  if (config.authToken) {
    app.use((req, res, next) => {
      // Skip auth for health check
      if (req.path === '/health') {
        return next();
      }

      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');

      if (token !== config.authToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      next();
    });
  }

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      transport: 'sse',
    });
  });

  // SSE endpoint
  app.get(config.ssePath, async (req: Request, res: Response) => {
    console.error('SSE connection established');

    const transport = new SSEServerTransport(config.ssePath, res);
    await server.connect(transport);

    // Keep the connection alive with heartbeats
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, config.heartbeatInterval);

    // Cleanup on connection close
    req.on('close', () => {
      console.error('SSE connection closed');
      clearInterval(heartbeat);
      transport.close();
    });
  });

  // POST endpoint for messages
  app.post(config.ssePath, async (req: Request, res: Response) => {
    try {
      // The SSE transport handles the message routing
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Error handling POST request:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return app;
}

/**
 * Start the SSE server
 */
export async function initializeSSETransport(
  server: Server,
  config: SSETransportConfig
): Promise<void> {
  const app = createSSETransport(server, config);

  return new Promise((resolve) => {
    app.listen(config.port, config.host, () => {
      console.error(`Hevy MCP Server running on http://${config.host}:${config.port}`);
      console.error(`SSE endpoint: http://${config.host}:${config.port}${config.ssePath}`);
      console.error(`Health check: http://${config.host}:${config.port}/health`);
      resolve();
    });
  });
}
