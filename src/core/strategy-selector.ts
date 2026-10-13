import type { RiskAssessment } from "./risk-score.ts";
import type { StrategyDecision } from "../domain/strategy.ts";

export function selectStrategy(risk: RiskAssessment): StrategyDecision {
  if (risk.level === "critical" || risk.level === "high") {
    return {
      strategy: "arrival_first",
      priority: [
        "latestArrivalGuarantee",
        "minimumTransfer",
        "availability",
        "price"
      ],
      explanation: "当前风险较高，应优先保证按时抵达。"
    };
  }

  if (risk.level === "medium") {
    return {
      strategy: "balanced",
      priority: ["arrivalTime", "price", "comfort"],
      explanation: "当前风险可控，平衡时间和成本。"
    };
  }

  return {
    strategy: "cost_first",
    priority: ["price", "duration"],
    explanation: "当前风险较低，可以优化成本。"
  };
}
