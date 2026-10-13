import { assessRisk } from "../core/risk-score.ts";
import { buildThreePlanSet } from "../core/scoring.ts";
import { buildSituation } from "../core/situation-model.ts";
import { selectStrategy } from "../core/strategy-selector.ts";
import type {
  RescueCandidate,
  RescueConstraints,
  RescuePersona
} from "../domain/rescue.ts";

export interface RescueDecisionInput {
  incidentType: string;
  userMessage: string;
  constraints: RescueConstraints;
  candidates: RescueCandidate[];
  nowIso?: string;
  inboundTraveler?: boolean;
  firstTimeChina?: boolean;
  uncertainty?: number;
}

export function composeRescueDecision(input: RescueDecisionInput) {
  const situation = buildSituation({
    incidentType: input.incidentType,
    userMessage: input.userMessage,
    latestArrivalIso: input.constraints.latestArrivalIso,
    nowIso: input.nowIso,
    inboundTraveler: input.inboundTraveler,
    firstTimeChina: input.firstTimeChina,
    language: input.constraints.language,
    mobilityNeeds: Boolean(input.constraints.mobilityNeeds?.length),
    uncertainty: input.uncertainty
  });

  const risk = assessRisk(situation);
  const strategy = selectStrategy(risk);
  const plans = buildThreePlanSet(input.candidates, input.constraints);

  const personaByStrategy: Record<typeof strategy.strategy, RescuePersona> = {
    arrival_first: "fastest",
    balanced: "safest",
    cost_first: "cheapest"
  };
  const recommendedPersona = personaByStrategy[strategy.strategy];

  return {
    status: plans[recommendedPersona] ? "ok" as const : "no_feasible_plan" as const,
    generatedAt: new Date().toISOString(),
    situation,
    risk,
    strategy,
    constraints: input.constraints,
    plans,
    recommendedPersona,
    recommendedPlan: plans[recommendedPersona],
    trustNotice:
      "Trip Rescue compares available options and provides booking links; it does not claim a booking or rebooking has succeeded unless a transaction provider confirms it."
  };
}
