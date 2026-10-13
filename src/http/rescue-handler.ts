import { composeLiveRescueFlow } from "../orchestrator/live-rescue-flow.ts";
import { InvalidRescueRequest, parseRescueRequest } from "./rescue-request.ts";
import { parseProviderRequest } from './provider-request.ts';

export async function handleRescueRequest(request: Request, requireIncidentDetails: boolean): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({
      error: "invalid_request",
      issues: [{ path: "$body", message: "must contain valid JSON" }]
    }, { status: 400 });
  }

  try {
    const input = requireIncidentDetails ? parseProviderRequest(body) : parseRescueRequest(body, false);
    return Response.json(composeLiveRescueFlow(input));
  } catch (error) {
    if (!(error instanceof InvalidRescueRequest)) throw error;
    return Response.json({
      error: "invalid_request",
      issues: [{ path: error.path, message: error.message }]
    }, { status: 400 });
  }
}
