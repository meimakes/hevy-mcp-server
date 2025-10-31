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

  // Store transports by sessionId for message routing
  const transports = new Map<string, SSEServerTransport>();

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

    // Store transport by its sessionId for message routing
    const sessionId = (transport as any).sessionId;
    if (sessionId) {
      // Set the session ID header for the client
      res.setHeader('Mcp-Session-Id', sessionId);

      transports.set(sessionId, transport);
      console.error(`Stored transport for session: ${sessionId}`);
    }

    await server.connect(transport);

    // Keep the connection alive with heartbeats
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, config.heartbeatInterval);

    // Cleanup on connection close
    req.on('close', () => {
      console.error('SSE connection closed');
      if (sessionId) {
        transports.delete(sessionId);
        console.error(`Removed transport for session: ${sessionId}`);
      }
      clearInterval(heartbeat);
      transport.close();
    });
  });

  // POST endpoint for messages
  app.post(config.ssePath, async (req: Request, res: Response) => {
    try {
      // Get sessionId from header (preferred) or query parameter (backward compatibility)
      const sessionId =
        (req.headers['mcp-session-id'] as string) ||
        (req.query.sessionId as string);

      if (!sessionId) {
        console.error('POST request missing sessionId (checked header and query parameter)');
        res.status(400).json({ error: 'Missing sessionId in Mcp-Session-Id header or sessionId query parameter' });
        return;
      }

      // Find the transport for this session
      const transport = transports.get(sessionId);

      if (!transport) {
        console.error(`No transport found for sessionId: ${sessionId}`);
        console.error(`Available sessions: ${Array.from(transports.keys()).join(', ')}`);
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Let the transport handle the incoming message
      console.error(`Handling POST message for session: ${sessionId}`);
      await transport.handlePostMessage(req, res, req.body);
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
