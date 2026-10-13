import { handleRescueRequest } from "../../../../src/http/rescue-handler.ts";
import { authorizePluginRequest } from "../../../../src/http/plugin-auth.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authorizePluginRequest(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return handleRescueRequest(request, true);
}
