import type { RescueSituation, RiskLevel } from "../domain/situation.ts";

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

export function assessRisk(situation: RescueSituation): RiskAssessment {
  let score = situation.deadlinePressure * 40 + situation.uncertainty * 20;

  if (situation.travelerProfile.languageRisk) score += 15;
  if (situation.travelerProfile.firstTimeChina) score += 10;
  if (situation.travelerProfile.inboundTraveler) score += 5;
  if (situation.travelerProfile.mobilityNeeds) score += 10;
  if (situation.incidentType === "missed_connection") score += 10;

  score = Math.min(100, Math.round(score));

  const level: RiskLevel =
    score >= 80 ? "critical" :
    score >= 60 ? "high" :
    score >= 30 ? "medium" :
    "low";

  return {
    score,
    level,
    reasons: situation.reasons
  };
}
