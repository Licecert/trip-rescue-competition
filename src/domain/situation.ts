export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface TravelerProfile {
  inboundTraveler: boolean;
  firstTimeChina: boolean;
  languageRisk: boolean;
  mobilityNeeds: boolean;
}

export interface RescueSituation {
  incidentType: string;
  severity: RiskLevel;
  deadlinePressure: number;
  uncertainty: number;
  travelerProfile: TravelerProfile;
  reasons: string[];
}
