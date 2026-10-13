export type RescueStrategy =
  | "arrival_first"
  | "balanced"
  | "cost_first";

export interface StrategyDecision {
  strategy: RescueStrategy;
  priority: string[];
  explanation: string;
}
