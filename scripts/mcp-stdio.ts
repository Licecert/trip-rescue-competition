import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRescueMcpServer } from '../src/http/mcp-server.ts';

// This local pipe is served behind Bailian's authenticated MCP gateway, never public TCP.
async function main() {
  const server = createRescueMcpServer();
  await server.connect(new StdioServerTransport());
}
main().catch(() => { console.error('Trip Rescue MCP startup failed'); process.exitCode = 1; });
