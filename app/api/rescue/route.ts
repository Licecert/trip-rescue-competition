import { handleRescueRequest } from "../../../src/http/rescue-handler.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRescueRequest(request, false);
}
