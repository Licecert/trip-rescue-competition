import type { RescueCandidate } from "../../domain/rescue.ts";
import { chinaIso, validSegmentTimeline } from "./segment-times.ts";

interface FlyAiTrainSegment {
  depDateTime?: unknown;
  arrDateTime?: unknown;
  depStationName?: unknown;
  arrStationName?: unknown;
  marketingTransportNo?: unknown;
  seatClassName?: unknown;
}

interface FlyAiTrainItem {
  journeys?: Array<{
    journeyType?: unknown;
    segments?: FlyAiTrainSegment[];
  }>;
  jumpUrl?: unknown;
  price?: unknown;
}

export interface FlyAiNormalizationResult {
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

export function normalizeFlyAiTrainResult(raw: unknown): FlyAiNormalizationResult {
  const warnings: string[] = [];
  const root = raw as { data?: { itemList?: unknown } };
  const items = root?.data?.itemList;

  if (!Array.isArray(items)) {
    return {
      candidates: [],
      warnings: ["FlyAI train response did not contain data.itemList"]
    };
  }

  const candidates: RescueCandidate[] = [];

  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { warnings.push(`Skipped train item ${index}: invalid item`); continue; }
    const train = item as FlyAiTrainItem;
    const rawSegments = train.journeys?.[0]?.segments;
    if (!validSegmentTimeline(rawSegments)) {
      warnings.push(`Skipped train item ${index}: missing or invalid segment`);
      continue;
    }
    const segments = rawSegments;
    const first = segments?.[0];
    const last = segments?.at(-1);
    const departureIso = chinaIso(first?.depDateTime);
    const arrivalIso = chinaIso(last?.arrDateTime);
    const priceCny = numericPrice(train.price);

    if (!departureIso || !arrivalIso) {
      warnings.push(
        `Skipped train item ${index}: missing or invalid departure/arrival time`
      );
      continue;
    }

    if (priceCny === null) {
      warnings.push(
        `Skipped train item ${index}: price is not numeric (experience-mode or incomplete result)`
      );
      continue;
    }

    const transportNo =
      typeof first?.marketingTransportNo === "string"
        ? first.marketingTransportNo
        : `train-${index + 1}`;
    const from =
      typeof first?.depStationName === "string"
        ? first.depStationName
        : "departure station";
    const to =
      typeof last?.arrStationName === "string"
        ? last.arrStationName
        : "arrival station";

    candidates.push({
      id: `flyai-train-${transportNo}-${departureIso}`,
      mode: "train",
      title: `${transportNo} ${from} → ${to}`,
      departureIso,
      arrivalIso,
      priceCny,
      transfers: Math.max(0, (segments?.length ?? 1) - 1),
      reliability: 0.5,
      bookingUrl: typeof train.jumpUrl === "string" ? train.jumpUrl : undefined,
      source: "flyai",
      warnings: [
        "FlyAI did not provide a reliability score; neutral 0.5 is used for deterministic ranking."
      ]
    });
  }

  return { candidates, warnings };
}
