import type { RescueCandidate } from "../../domain/rescue.ts";
import { chinaIso, validSegmentTimeline } from "./segment-times.ts";

interface FlyAiFlightSegment {
  depDateTime?: unknown;
  arrDateTime?: unknown;
  depStationName?: unknown;
  arrStationName?: unknown;
  marketingTransportNo?: unknown;
}

interface FlyAiFlightItem {
  journeys?: Array<{ segments?: FlyAiFlightSegment[] }>;
  jumpUrl?: unknown;
  ticketPrice?: unknown;
}

export interface FlyAiFlightNormalizationResult {
  candidates: RescueCandidate[];
  warnings: string[];
}

function numericPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value !== "string" ||
    !/^\d+(?:\.\d+)?$/.test(value.trim())
  ) {
    return null;
  }
  return Number(value);
}

export function normalizeFlyAiFlightResult(raw: unknown): FlyAiFlightNormalizationResult {
  const warnings: string[] = [];
  const items = (raw as { data?: { itemList?: unknown } })?.data?.itemList;

  if (!Array.isArray(items)) {
    return {
      candidates: [],
      warnings: ["FlyAI flight response did not contain data.itemList"]
    };
  }

  const candidates: RescueCandidate[] = [];

  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { warnings.push(`Skipped flight item ${index}: invalid item`); continue; }
    const flight = item as FlyAiFlightItem;
    const rawSegments = flight.journeys?.[0]?.segments;
    if (!validSegmentTimeline(rawSegments)) {
      warnings.push(`Skipped flight item ${index}: missing or invalid segment`);
      continue;
    }
    const segments = rawSegments;
    const first = segments?.[0];
    const last = segments?.at(-1);
    const departureIso = chinaIso(first?.depDateTime);
    const arrivalIso = chinaIso(last?.arrDateTime);
    const priceCny = numericPrice(flight.ticketPrice);

    if (!departureIso || !arrivalIso) {
      warnings.push(
        `Skipped flight item ${index}: missing or invalid departure/arrival time`
      );
      continue;
    }

    if (priceCny === null) {
      warnings.push(
        `Skipped flight item ${index}: ticketPrice is not numeric`
      );
      continue;
    }

    const transportNumbers =
      (segments ?? [])
        .map((segment) =>
          typeof segment.marketingTransportNo === "string"
            ? segment.marketingTransportNo
            : null
        )
        .filter(Boolean)
        .join(" + ") || `flight-${index + 1}`;

    const from =
      typeof first?.depStationName === "string"
        ? first.depStationName
        : "departure airport";
    const to =
      typeof last?.arrStationName === "string"
        ? last.arrStationName
        : "arrival airport";

    candidates.push({
      id: `flyai-flight-${transportNumbers}-${departureIso}`,
      mode: "flight",
      title: `${transportNumbers} ${from} → ${to}`,
      departureIso,
      arrivalIso,
      priceCny,
      transfers: Math.max(0, (segments?.length ?? 1) - 1),
      reliability: 0.5,
      bookingUrl:
        typeof flight.jumpUrl === "string" ? flight.jumpUrl : undefined,
      source: "flyai",
      warnings: [
        "FlyAI did not provide a reliability score; neutral 0.5 is used for deterministic ranking."
      ]
    });
  }

  return { candidates, warnings };
}
