import type { RescueCandidate } from "../../domain/rescue.ts";
import { normalizeFlyAiFlightResult } from "./normalize-flight.ts";
import { normalizeFlyAiTrainResult } from "./normalize-train.ts";

export interface ProviderInventory {
  candidates: RescueCandidate[];
  warnings: string[];
  source: "flyai";
  generatedAt: string;
}

export interface FlyAiSearchResponse {
  data?: unknown;
  status?: unknown;
  systemMessage?: unknown;
  warnings?: unknown;
}

export function mergeFlyAiTransportResults(input: {
  train?: FlyAiSearchResponse;
  flight?: FlyAiSearchResponse;
}): ProviderInventory {
  const normalize = (raw: FlyAiSearchResponse | undefined, mode: 'train' | 'flight') => {
    if (!raw) return { candidates: [], warnings: [] };
    const warnings = [
      ...(typeof raw.systemMessage === 'string' ? [raw.systemMessage] : []),
      ...(Array.isArray(raw.warnings) ? raw.warnings.filter((w): w is string => typeof w === 'string') : [])
    ];
    if (raw.status !== undefined && raw.status !== 0) return { candidates: [], warnings: [...warnings, `FlyAI ${mode} reported an upstream error; cached rows were not used.`] };
    try {
      const result = mode === 'train' ? normalizeFlyAiTrainResult(raw) : normalizeFlyAiFlightResult(raw);
      return { candidates: result.candidates, warnings: [...warnings, ...result.warnings] };
    } catch { return { candidates: [], warnings: [...warnings, `FlyAI ${mode} response could not be normalized.`] }; }
  };
  const train = normalize(input.train, 'train');
  const flight = normalize(input.flight, 'flight');

  return {
    candidates: [...train.candidates, ...flight.candidates],
    warnings: [...train.warnings, ...flight.warnings],
    source: "flyai",
    generatedAt: new Date().toISOString()
  };
}
