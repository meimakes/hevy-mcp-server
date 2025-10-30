import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Initialize stdio transport for Claude Desktop
 * This transport uses stdin/stdout for communication
 */
export async function initializeStdioTransport(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with stdio communication
  console.error('Hevy MCP Server running on stdio transport');
}
