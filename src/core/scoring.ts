import type {
  RankedRescuePlan,
  RescueCandidate,
  RescueConstraints,
  RescuePersona
} from "../domain/rescue.ts";

const WEIGHTS: Record<RescuePersona, { time: number; cost: number; reliability: number; simplicity: number }> = {
  fastest: { time: 0.55, cost: 0.1, reliability: 0.25, simplicity: 0.1 },
  cheapest: { time: 0.2, cost: 0.5, reliability: 0.2, simplicity: 0.1 },
  safest: { time: 0.25, cost: 0.05, reliability: 0.5, simplicity: 0.2 }
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function epoch(iso: string): number {
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) throw new Error(`Invalid ISO date: ${iso}`);
  return value;
}

function feasible(candidate: RescueCandidate, constraints: RescueConstraints): boolean {
  if (constraints.latestArrivalIso && epoch(candidate.arrivalIso) > epoch(constraints.latestArrivalIso)) {
    return false;
  }
  if (typeof constraints.budgetCny === "number" && candidate.priceCny > constraints.budgetCny) {
    return false;
  }
  if (constraints.earliestDepartureIso && epoch(candidate.departureIso) < epoch(constraints.earliestDepartureIso)) {
    return false;
  }
  return true;
}

function normalizeInverse(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return clamp01(1 - (value - min) / (max - min));
}

export function rankRescueCandidates(
  candidates: RescueCandidate[],
  constraints: RescueConstraints,
  persona: RescuePersona
): RankedRescuePlan[] {
  if (candidates.length === 0) return [];

  const arrivals = candidates.map((c) => epoch(c.arrivalIso));
  const prices = candidates.map((c) => c.priceCny);
  const minArrival = Math.min(...arrivals);
  const maxArrival = Math.max(...arrivals);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const weights = WEIGHTS[persona];

  return candidates
    .map((candidate) => {
      const isFeasible = feasible(candidate, constraints);
      const timeScore = normalizeInverse(epoch(candidate.arrivalIso), minArrival, maxArrival);
      const costScore = normalizeInverse(candidate.priceCny, minPrice, maxPrice);
      const reliabilityScore = clamp01(candidate.reliability);
      const simplicityScore = clamp01(1 - candidate.transfers * 0.25);
      const raw =
        timeScore * weights.time +
        costScore * weights.cost +
        reliabilityScore * weights.reliability +
        simplicityScore * weights.simplicity;
      const score = isFeasible ? raw : raw * 0.15;

      const rationale = [
        `arrival=${candidate.arrivalIso}`,
        `price=¥${candidate.priceCny}`,
        `transfers=${candidate.transfers}`,
        `reliability=${reliabilityScore.toFixed(2)}`
      ];
      if (!isFeasible) rationale.unshift("violates a hard user constraint");

      return {
        ...candidate,
        persona,
        feasible: isFeasible,
        score: Number(score.toFixed(4)),
        rationale
      };
    })
    .sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      // The advertised persona is the primary objective; weights only break ties.
      if (persona === 'cheapest' && a.priceCny !== b.priceCny) return a.priceCny - b.priceCny;
      if (persona === 'fastest' && a.arrivalIso !== b.arrivalIso) return epoch(a.arrivalIso) - epoch(b.arrivalIso);
      return b.score - a.score;
    });
}

export function buildThreePlanSet(
  candidates: RescueCandidate[],
  constraints: RescueConstraints
): Record<RescuePersona, RankedRescuePlan | null> {
  const pick = (persona: RescuePersona) =>
    rankRescueCandidates(candidates, constraints, persona).find((plan) => plan.feasible) ?? null;
  return {
    fastest: pick("fastest"),
    cheapest: pick("cheapest"),
    safest: pick("safest")
  };
}
