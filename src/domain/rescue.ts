export type IncidentType =
  | "missed_connection"
  | "delay_or_cancellation"
  | "stranded"
  | "booking_disruption"
  | "language_barrier"
  | "payment_barrier"
  | "attraction_disruption"
  | "other";

export type TransportMode = "train" | "flight" | "ground" | "mixed";

export interface RescueConstraints {
  origin: string;
  destination: string;
  earliestDepartureIso?: string;
  latestArrivalIso?: string;
  budgetCny?: number;
  passengerCount?: number;
  language?: string;
  baggage?: "light" | "standard" | "heavy";
  mobilityNeeds?: string[];
  existingBookings?: string[];
  notes?: string[];
}

export interface RescueCandidate {
  id: string;
  mode: TransportMode;
  title: string;
  departureIso: string;
  arrivalIso: string;
  priceCny: number;
  transfers: number;
  reliability: number; // 0..1, derived from currently available evidence
  bookingUrl?: string;
  source: "flyai" | "manual" | "fixture";
  warnings?: string[];
}

export type RescuePersona = "fastest" | "cheapest" | "safest";

export interface RankedRescuePlan extends RescueCandidate {
  persona: RescuePersona;
  feasible: boolean;
  score: number;
  rationale: string[];
}

export interface RescueRequest {
  incidentType: IncidentType;
  userMessage: string;
  constraints: RescueConstraints;
}
