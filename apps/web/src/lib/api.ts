import { PcnClient } from '@pcn/sdk';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Server-side API client. Add accessToken from cookies in route handlers. */
export const apiServer = () => new PcnClient({ baseUrl });

/** Browser-side API client (no token here; auth is wired via httpOnly cookies + a /api proxy). */
export const apiBrowser = () => new PcnClient({ baseUrl });
