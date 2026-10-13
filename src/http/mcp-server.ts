import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { InvalidRescueRequest } from './rescue-request.ts';
import { parseProviderRequest } from './provider-request.ts';
import { composeLiveRescueFlow } from '../orchestrator/live-rescue-flow.ts';


const constraints = z.object({ origin: z.string().min(1), destination: z.string().min(1), earliestDepartureIso: z.string().optional(), latestArrivalIso: z.string().optional(), budgetCny: z.number().nonnegative().optional(), passengerCount: z.number().int().positive().optional(), language: z.string().optional(), baggage: z.enum(['light', 'standard', 'heavy']).optional(), mobilityNeeds: z.array(z.string()).optional(), existingBookings: z.array(z.string()).optional(), notes: z.array(z.string()).optional() });
const candidate = z.object({ id: z.string(), mode: z.enum(['train', 'flight', 'ground', 'mixed']), title: z.string(), departureIso: z.string(), arrivalIso: z.string(), priceCny: z.number().nonnegative(), transfers: z.number().int().nonnegative(), reliability: z.number().min(0).max(1), source: z.enum(['flyai', 'manual', 'fixture']), bookingUrl: z.string().optional(), warnings: z.array(z.string()).optional() });

/** The same tool and trust boundary are used by HTTP and hosted stdio transports. */
export function createRescueMcpServer(trustedNowIso?: string) {
  const server = new McpServer({ name: 'trip-rescue', version: '0.3.0' }, { maxToolInputElements: 10000 });
  server.registerTool('buildRescueDecision', {
    description: 'After a trip disruption, compare verified travel options as Plan A fastest, B cheapest and C lowest operational risk. Search with FlyAI first and supply candidates OR unmodified raw train/flight results. budgetCny is per passenger. Preserve timestamps, source and warnings. Never invent prices or claim booking success. No model API key is needed by this tool.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      incidentType: z.enum(['missed_connection', 'delay_or_cancellation', 'stranded', 'booking_disruption', 'language_barrier', 'payment_barrier', 'attraction_disruption', 'other']), userMessage: z.string().min(1).max(4000), constraints,
      candidates: z.array(candidate).max(200).optional(),
      providerResults: z.object({ train: z.record(z.unknown()).optional(), flight: z.record(z.unknown()).optional() }).optional(),
      providerGeneratedAt: z.string().optional(), providerWarnings: z.array(z.string()).optional(), providerSource: z.string().optional(),
      nowIso: z.string().optional(), inboundTraveler: z.boolean().optional(), firstTimeChina: z.boolean().optional(), uncertainty: z.number().min(0).max(1).optional()
    }
  }, async args => {
    try {
      const result = composeLiveRescueFlow(parseProviderRequest(args, trustedNowIso));
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof InvalidRescueRequest ? `${error.path}: ${error.message}` : 'Invalid provider results; no recovery plan was inferred.' }] };
    }
  });
  return server;
}
