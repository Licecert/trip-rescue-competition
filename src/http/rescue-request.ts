import type { RescueCandidate, RescueConstraints } from "../domain/rescue.ts";
import type { LiveRescueFlowInput } from "../orchestrator/live-rescue-flow.ts";

export class InvalidRescueRequest extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(message);
    this.name = "InvalidRescueRequest";
    this.path = path;
  }
}

function invalid(path: string, message: string): never {
  throw new InvalidRescueRequest(path, message);
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(path, "must be an object");
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) invalid(path, "must be a non-empty string");
  return value;
}

function optional<T>(value: unknown, path: string, parse: (value: unknown, path: string) => T): T | undefined {
  return value === undefined ? undefined : parse(value, path);
}

function number(value: unknown, path: string, min = 0, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    invalid(path, `must be a finite number >= ${min}${Number.isFinite(max) ? ` and <= ${max}` : ""}`);
  }
  return value;
}

function integer(value: unknown, path: string, min = 0): number {
  const parsed = number(value, path, min);
  if (!Number.isInteger(parsed)) invalid(path, "must be an integer");
  return parsed;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") invalid(path, "must be a boolean");
  return value;
}

function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) invalid(path, "must be an array of strings");
  return value.map((item, index) => text(item, `${path}[${index}]`));
}

function choice<T extends string>(value: unknown, path: string, choices: readonly T[]): T {
  const match = choices.find((item) => item === value);
  if (match === undefined) invalid(path, `must be one of: ${choices.join(", ")}`);
  return match;
}

function timestamp(value: unknown, path: string): string {
  const parsed = text(value, path);
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(parsed);
  if (!match) invalid(path, "must be an ISO date-time with seconds and an explicit timezone");
  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match;
  const y = Number(year);
  const leapYear = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    Number(month) < 1 || Number(month) > 12 ||
    Number(day) < 1 || Number(day) > monthDays[Number(month) - 1] ||
    Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 ||
    Number(offsetHour ?? 0) > 23 || Number(offsetMinute ?? 0) > 59 ||
    !Number.isFinite(Date.parse(parsed))
  ) invalid(path, "must be a real calendar date and time");
  return parsed;
}

function bookingUrl(value: unknown, path: string): string {
  const parsed = text(value, path);
  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    return invalid(path, "must be an absolute HTTP or HTTPS URL");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    invalid(path, "must be an HTTP or HTTPS URL without embedded credentials");
  }
  return parsed;
}

function constraints(value: unknown): RescueConstraints {
  const c = object(value, "constraints");
  const earliestDepartureIso = optional(c.earliestDepartureIso, "constraints.earliestDepartureIso", timestamp);
  const latestArrivalIso = optional(c.latestArrivalIso, "constraints.latestArrivalIso", timestamp);
  if (earliestDepartureIso && latestArrivalIso && Date.parse(earliestDepartureIso) > Date.parse(latestArrivalIso)) {
    invalid("constraints.latestArrivalIso", "must not be before earliestDepartureIso");
  }
  return {
    origin: text(c.origin, "constraints.origin"),
    destination: text(c.destination, "constraints.destination"),
    earliestDepartureIso,
    latestArrivalIso,
    budgetCny: optional(c.budgetCny, "constraints.budgetCny", number),
    passengerCount: optional(c.passengerCount, "constraints.passengerCount", (v, p) => integer(v, p, 1)),
    language: optional(c.language, "constraints.language", text),
    baggage: optional(c.baggage, "constraints.baggage", (v, p) => choice(v, p, ["light", "standard", "heavy"] as const)),
    mobilityNeeds: optional(c.mobilityNeeds, "constraints.mobilityNeeds", strings),
    existingBookings: optional(c.existingBookings, "constraints.existingBookings", strings),
    notes: optional(c.notes, "constraints.notes", strings)
  };
}

function candidate(value: unknown, path: string): RescueCandidate {
  const c = object(value, path);
  const departureIso = timestamp(c.departureIso, `${path}.departureIso`);
  const arrivalIso = timestamp(c.arrivalIso, `${path}.arrivalIso`);
  if (Date.parse(arrivalIso) <= Date.parse(departureIso)) invalid(`${path}.arrivalIso`, "must be after departureIso");
  return {
    id: text(c.id, `${path}.id`),
    mode: choice(c.mode, `${path}.mode`, ["train", "flight", "ground", "mixed"] as const),
    title: text(c.title, `${path}.title`),
    departureIso,
    arrivalIso,
    priceCny: number(c.priceCny, `${path}.priceCny`),
    transfers: integer(c.transfers, `${path}.transfers`),
    reliability: number(c.reliability, `${path}.reliability`, 0, 1),
    bookingUrl: optional(c.bookingUrl, `${path}.bookingUrl`, bookingUrl),
    source: choice(c.source, `${path}.source`, ["flyai", "manual", "fixture"] as const),
    warnings: optional(c.warnings, `${path}.warnings`, strings)
  };
}

/** Validate untrusted HTTP JSON without coercing hard constraints or inventing missing facts. */
export function parseRescueRequest(value: unknown, requireIncidentDetails: boolean): LiveRescueFlowInput {
  const body = object(value, "$body");
  const parsedConstraints = constraints(body.constraints);
  if (!Array.isArray(body.candidates)) invalid("candidates", "must be an array");
  const incidentType = body.incidentType === undefined && !requireIncidentDetails ? "other" :
    choice(body.incidentType, "incidentType", [
      "missed_connection", "delay_or_cancellation", "stranded", "booking_disruption",
      "language_barrier", "payment_barrier", "attraction_disruption", "other"
    ] as const);
  const userMessage = body.userMessage === undefined && !requireIncidentDetails ? "" : text(body.userMessage, "userMessage");
  return {
    incidentType,
    userMessage,
    constraints: parsedConstraints,
    providerCandidates: body.candidates.map((item, index) => candidate(item, `candidates[${index}]`)),
    providerSource: optional(body.providerSource, "providerSource", text),
    providerGeneratedAt: optional(body.providerGeneratedAt, "providerGeneratedAt", timestamp),
    providerWarnings: optional(body.providerWarnings, "providerWarnings", strings),
    nowIso: optional(body.nowIso, "nowIso", timestamp),
    inboundTraveler: optional(body.inboundTraveler, "inboundTraveler", boolean),
    firstTimeChina: optional(body.firstTimeChina, "firstTimeChina", boolean),
    uncertainty: optional(body.uncertainty, "uncertainty", (v, p) => number(v, p, 0, 1))
  };
}
