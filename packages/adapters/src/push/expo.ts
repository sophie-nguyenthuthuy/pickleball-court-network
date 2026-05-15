/**
 * Expo Push API. Expo proxies APNs + FCM for us — no need to deal with
 * provider creds directly. Tokens are obtained on the mobile app at sign-in.
 */
import { errors } from '@pcn/core/errors';

export interface ExpoPushConfig {
  accessToken?: string;
  endpoint?: string;
}

export interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  ttl?: number;
}

const DEFAULT_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export const sendPush = async (
  cfg: ExpoPushConfig,
  messages: ExpoPushMessage[],
): Promise<{ ok: boolean; results: unknown }> => {
  const res = await fetch(cfg.endpoint ?? DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(cfg.accessToken ? { authorization: `Bearer ${cfg.accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) throw errors.internal(`Expo push HTTP ${res.status}`);
  const json = await res.json();
  return { ok: true, results: json };
};
