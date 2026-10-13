import { composeRescueDecision } from "./rescue-decision-engine.ts";
import type { RescueCandidate, RescueConstraints } from "../domain/rescue.ts";

export interface LiveRescueFlowInput {
  incidentType: string;
  userMessage: string;
  constraints: RescueConstraints;
  providerCandidates: RescueCandidate[];
  providerWarnings?: string[];
  providerSource?: string;
  providerGeneratedAt?: string;
  inboundTraveler?: boolean;
  firstTimeChina?: boolean;
  nowIso?: string;
  uncertainty?: number;
}

export function composeLiveRescueFlow(input: LiveRescueFlowInput) {
  const decision = composeRescueDecision({
    incidentType: input.incidentType,
    userMessage: input.userMessage,
    constraints: input.constraints,
    candidates: input.providerCandidates,
    inboundTraveler: input.inboundTraveler,
    firstTimeChina: input.firstTimeChina,
    nowIso: input.nowIso,
    uncertainty: input.uncertainty
  });

  return {
    ...decision,
    evidence: {
      source: input.providerSource ?? "unknown",
      generatedAt: input.providerGeneratedAt ?? null,
      candidateCount: input.providerCandidates.length,
      candidates: input.providerCandidates,
      warnings: input.providerWarnings ?? []
    }
  };
}
