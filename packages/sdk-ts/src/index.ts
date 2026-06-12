import { z } from 'zod';

/** Versioned, hand-rolled SDK so partners (clubs, federations) can integrate. */

export interface PcnClientOptions {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

export class PcnClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: PcnClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    // The browser `fetch` throws "Illegal invocation" when called with a `this`
    // other than the global object, so we must NOT store it as a bound method.
    // Wrap a custom impl too, so all call sites go through a plain function.
    const impl = opts.fetchImpl;
    this.fetchImpl = impl
      ? (...args: Parameters<typeof fetch>) => impl(...args)
      : (...args: Parameters<typeof fetch>) => fetch(...args);
    this.headers = {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(opts.apiKey ? { 'x-api-key': opts.apiKey } : {}),
      ...(opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {}),
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new PcnApiError(res.status, text);
    }
    return (await res.json()) as T;
  }

  // Public surface — minimal at v0.1; expand as we stabilise routes.
  searchVenues(input: SearchVenuesInput): Promise<SearchVenuesResult> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    return this.request('GET', `/v1/venues?${q.toString()}`);
  }

  getVenue(slug: string): Promise<VenueDetail> {
    return this.request('GET', `/v1/venues/${slug}`);
  }

  listSlots(courtId: string, date: string): Promise<SlotList> {
    return this.request('GET', `/v1/courts/${courtId}/slots?date=${date}`);
  }

  createBooking(input: CreateBookingInput): Promise<BookingDraft> {
    return this.request('POST', `/v1/bookings`, input);
  }
}

export class PcnApiError extends Error {
  constructor(public readonly status: number, body: string) {
    super(`PCN API ${status}: ${body}`);
    this.name = 'PcnApiError';
  }
}

export const SearchVenuesInput = z.object({
  city: z.string().optional(),
  district: z.string().optional(),
  sport: z.enum(['PICKLEBALL', 'PADEL']).optional(),
  near_lat: z.number().optional(),
  near_lng: z.number().optional(),
  radius_km: z.number().optional(),
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
});
export type SearchVenuesInput = z.infer<typeof SearchVenuesInput>;

export interface SearchVenuesResult {
  items: VenueSummary[];
  page: number;
  total: number;
}

export interface VenueSummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string;
  sports: string[];
  rating: number | null;
  imageUrl: string | null;
  distanceKm?: number;
}

export interface VenueDetail extends VenueSummary {
  addressLine: string;
  amenities: Record<string, boolean>;
  courts: Array<{ id: string; name: string; sport: string; surface: string; kind: string }>;
  phone: string | null;
  zaloContact: string | null;
}

export interface SlotList {
  date: string;
  slots: Array<{ start: string; end: string; priceVnd: string; available: boolean; isPeak: boolean }>;
}

export const CreateBookingInput = z.object({
  courtId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
  source: z.enum(['WEB', 'MOBILE', 'ZALO_OA', 'API']).default('API'),
  idempotencyKey: z.string().min(8),
  notes: z.string().max(500).optional(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingInput>;

export interface BookingDraft {
  id: string;
  code: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED';
  priceVnd: string;
  paymentRedirectUrl?: string;
  expiresAt: string;
}
