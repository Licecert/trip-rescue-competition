import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authorizePluginRequest } from './plugin-auth.ts';
import { createRescueMcpServer } from './mcp-server.ts';

/** Stateless SDK transport: each request can run on a separate Vercel instance. */
export async function handleMcpRequest(request: Request, token = process.env.TRIP_RESCUE_PLUGIN_TOKEN, trustedNowIso?: string): Promise<Response> {
  if (!authorizePluginRequest(request.headers.get('authorization'), token)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'forbidden_origin' }, { status: 403 });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const server = createRescueMcpServer(trustedNowIso);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 256000 });
  try { await server.connect(transport); return await transport.handleRequest(request); }
  finally { await server.close(); }
}
