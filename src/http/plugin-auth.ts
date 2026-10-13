export function authorizePluginRequest(
  authorizationHeader: string | null,
  configuredToken = process.env.TRIP_RESCUE_PLUGIN_TOKEN
): boolean {
  // Public deployments must never treat a missing token as permission to call the API.
  if (!configuredToken || !configuredToken.trim()) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;

  const supplied = authorizationHeader.slice("Bearer ".length);
  if (supplied.length !== configuredToken.length) return false;

  let mismatch = 0;
  for (let index = 0; index < configuredToken.length; index += 1) {
    mismatch |= configuredToken.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return mismatch === 0;
}
