import { mergeFlyAiTransportResults } from '../providers/flyai/provider-adapter.ts';
import { InvalidRescueRequest, parseRescueRequest } from './rescue-request.ts';

/** Shared trust boundary for the hosted Agent's HTTPS and native MCP integrations. */
export function parseProviderRequest(value: unknown, trustedNowIso?: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidRescueRequest('$body', 'must be an object');
  const args = value as Record<string, unknown>;
  if (args.candidates !== undefined && args.providerResults !== undefined) throw new InvalidRescueRequest('candidates', 'supply candidates OR providerResults, exactly one');
  let requestBody = args;
  if (args.providerResults !== undefined) {
    const results = args.providerResults;
    if (!results || typeof results !== 'object' || Array.isArray(results)) throw new InvalidRescueRequest('providerResults', 'must be an object');
    const inventory = mergeFlyAiTransportResults(results);
    const shared = parseRescueRequest({ ...args, candidates: [] }, true);
    inventory.candidates = inventory.candidates.filter(candidate => {
      try { parseRescueRequest({ ...args, candidates: [candidate] }, true); return true; }
      catch (error) {
        inventory.warnings.push(`Skipped invalid provider candidate ${candidate.id}: ${error instanceof InvalidRescueRequest ? error.message : 'invalid fields'}`);
        return false;
      }
    });
    requestBody = { ...args, candidates: inventory.candidates, providerSource: 'flyai', providerWarnings: [...(shared.providerWarnings ?? []), ...inventory.warnings] };
  }
  const parsed = parseRescueRequest(requestBody, true);
  if (parsed.providerCandidates.length > 200) throw new InvalidRescueRequest('candidates', 'must contain at most 200 candidates');
  const fixtureOnly = parsed.providerCandidates.length > 0 && parsed.providerCandidates.every(c => c.source === 'fixture');
  const nowIso = trustedNowIso ?? (fixtureOnly ? parsed.nowIso : undefined) ?? new Date().toISOString();
  parsed.nowIso = nowIso;
  if (!fixtureOnly && (!parsed.constraints.earliestDepartureIso || Date.parse(parsed.constraints.earliestDepartureIso) < Date.parse(nowIso))) parsed.constraints.earliestDepartureIso = nowIso;
  return parsed;
}
