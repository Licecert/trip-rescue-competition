import type { RescueSituation } from "../domain/situation.ts";

export interface SituationInput {
  incidentType: string;
  userMessage: string;
  latestArrivalIso?: string;
  nowIso?: string;
  inboundTraveler?: boolean;
  firstTimeChina?: boolean;
  language?: string;
  mobilityNeeds?: boolean;
  uncertainty?: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function deadlinePressure(latestArrivalIso?: string, nowIso?: string): number {
  if (!latestArrivalIso) return 0.25;

  const deadline = Date.parse(latestArrivalIso);
  const now = nowIso ? Date.parse(nowIso) : Date.now();
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return 0.5;

  const hours = (deadline - now) / 3_600_000;
  if (hours <= 2) return 1;
  if (hours <= 6) return 0.9;
  if (hours <= 12) return 0.75;
  if (hours <= 24) return 0.55;
  return 0.35;
}

export function buildSituation(input: SituationInput): RescueSituation {
  const pressure = deadlinePressure(input.latestArrivalIso, input.nowIso);
  const languageRisk = Boolean(input.language && !input.language.toLowerCase().startsWith("zh"));
  const firstTimeChina = Boolean(input.firstTimeChina);
  const reasons: string[] = [];

  if (pressure >= 0.75) reasons.push("存在较强到达截止时间压力");
  if (languageRisk) reasons.push("存在语言沟通风险");
  if (firstTimeChina) reasons.push("首次中国旅行增加操作风险");
  if (input.incidentType === "missed_connection") reasons.push("原交通链路已经断裂");
  if (input.mobilityNeeds) reasons.push("存在无障碍或行动协助需求");

  const severity = pressure >= 0.9 ? "high" : pressure >= 0.55 ? "medium" : "low";

  return {
    incidentType: input.incidentType,
    severity,
    deadlinePressure: pressure,
    uncertainty: clamp01(input.uncertainty ?? 0.4),
    travelerProfile: {
      inboundTraveler: Boolean(input.inboundTraveler),
      firstTimeChina,
      languageRisk,
      mobilityNeeds: Boolean(input.mobilityNeeds)
    },
    reasons
  };
}
