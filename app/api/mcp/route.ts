import { handleMcpRequest } from '../../../src/http/mcp-handler.ts';
export const runtime = 'nodejs';
export async function POST(request: Request) { return handleMcpRequest(request); }
export async function GET(request: Request) { return handleMcpRequest(request); }
export async function DELETE(request: Request) { return handleMcpRequest(request); }
