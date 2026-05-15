/**
 * Zalo Official Account (OA) — the *primary* booking channel for PCN.
 *
 * We support three message types:
 *   - sendText: free-form text (only valid inside the 48h post-interaction window)
 *   - sendTemplate: ZNS / OA template (paid, but always deliverable)
 *   - sendQuickReply: text + quick reply chips (booking flow)
 *
 * The Zalo OA API uses access tokens that rotate every ~25h via refresh tokens;
 * the caller is responsible for token rotation (see apps/worker/token-rotator).
 */
import { errors } from '@pcn/core/errors';

export interface ZaloOaConfig {
  accessToken: string;
  endpointBase?: string;
}

const DEFAULT_ENDPOINT = 'https://openapi.zalo.me/v3.0/oa';

const post = async <T>(cfg: ZaloOaConfig, path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${cfg.endpointBase ?? DEFAULT_ENDPOINT}${path}`, {
    method: 'POST',
    headers: { access_token: cfg.accessToken, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw errors.internal(`Zalo OA HTTP ${res.status}`);
  const json = (await res.json()) as { error?: number; message?: string; data?: T };
  if (json.error && json.error !== 0) {
    throw errors.internal(`Zalo OA error ${json.error}: ${json.message}`);
  }
  return json.data as T;
};

export interface SentMessage {
  message_id: string;
}

export const sendText = (cfg: ZaloOaConfig, zaloUserId: string, text: string) =>
  post<SentMessage>(cfg, '/message/cs', {
    recipient: { user_id: zaloUserId },
    message: { text },
  });

export interface QuickReply {
  title: string;
  payload?: string;
}

export const sendQuickReply = (
  cfg: ZaloOaConfig,
  zaloUserId: string,
  text: string,
  replies: QuickReply[],
) =>
  post<SentMessage>(cfg, '/message/cs', {
    recipient: { user_id: zaloUserId },
    message: {
      text,
      attachment: {
        type: 'template',
        payload: {
          template_type: 'quick_reply',
          buttons: replies.map((r) => ({ title: r.title, payload: r.payload ?? r.title })),
        },
      },
    },
  });

export interface BookingConfirmationCard {
  bookingCode: string;
  venueName: string;
  courtName: string;
  startAt: string;
  durationMinutes: number;
  priceVnd: bigint;
  detailsUrl: string;
}

export const sendBookingConfirmation = (
  cfg: ZaloOaConfig,
  zaloUserId: string,
  card: BookingConfirmationCard,
) =>
  post<SentMessage>(cfg, '/message/cs', {
    recipient: { user_id: zaloUserId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'list',
          elements: [
            {
              title: `${card.venueName} — ${card.courtName}`,
              subtitle: `${card.startAt} · ${card.durationMinutes}p · ${card.priceVnd.toString()}đ`,
              image_url: undefined,
              default_action: { type: 'oa.open.url', url: card.detailsUrl },
            },
          ],
        },
      },
    },
  });

export interface ZaloOaWebhookEvent {
  app_id?: string;
  user_id_by_app?: string;
  event_name?:
    | 'user_send_text'
    | 'user_send_image'
    | 'user_click_chatnow'
    | 'follow'
    | 'unfollow';
  sender?: { id: string };
  recipient?: { id: string };
  message?: { msg_id?: string; text?: string; attachments?: unknown[] };
  timestamp?: string;
  mac?: string;
}

/**
 * Verify Zalo OA webhook signature. Zalo signs with sha256(JSON_BODY + secret).
 * Caller must pass the raw JSON body string, not the parsed object.
 */
export const verifyWebhookSignature = (
  rawBody: string,
  receivedMac: string,
  oaSecret: string,
): boolean => {
  // node:crypto is fine here; using subtle to avoid an extra import path
  const { createHmac, timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
  const expected = createHmac('sha256', oaSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedMac);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
