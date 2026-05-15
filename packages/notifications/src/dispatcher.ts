import { ZaloOa, Push, Sms } from '@pcn/adapters';

import { render, type TemplateId, type TemplatePayload } from './templates.js';

export type Channel = 'PUSH' | 'ZALO_OA_MSG' | 'ZALO_ZNS' | 'SMS' | 'EMAIL' | 'IN_APP';

export interface DispatchTarget {
  zaloUserId?: string;
  phone?: string;
  pushTokens?: string[];
  email?: string;
}

export interface Adapters {
  zaloOa?: { accessToken: string };
  push?: { accessToken?: string };
  sms?: { apiKey: string; secretKey: string; brandName: string };
}

export interface DispatchResult {
  channel: Channel;
  ok: boolean;
  message?: string;
}

/**
 * The dispatcher decides *how* to deliver — apps call this with the recipient
 * profile + their preferred channel and the dispatcher falls back through
 * the available channels in priority order.
 *
 * Default priority: Zalo OA → push → SMS. Email is opt-in only.
 */
export const dispatch = async (
  templateId: TemplateId,
  payload: TemplatePayload,
  target: DispatchTarget,
  preferred: Channel,
  adapters: Adapters,
): Promise<DispatchResult> => {
  const rendered = render(templateId, payload);

  const order: Channel[] =
    preferred === 'PUSH'
      ? ['PUSH', 'ZALO_OA_MSG', 'SMS']
      : preferred === 'SMS'
        ? ['SMS', 'ZALO_OA_MSG', 'PUSH']
        : ['ZALO_OA_MSG', 'PUSH', 'SMS'];

  for (const channel of order) {
    try {
      if (channel === 'ZALO_OA_MSG' && target.zaloUserId && adapters.zaloOa) {
        await ZaloOa.sendText({ accessToken: adapters.zaloOa.accessToken }, target.zaloUserId, `${rendered.title}\n\n${rendered.body}`);
        return { channel, ok: true };
      }
      if (channel === 'PUSH' && target.pushTokens?.length && adapters.push) {
        await Push.sendPush(
          { accessToken: adapters.push.accessToken },
          target.pushTokens.map((to) => ({ to, title: rendered.title, body: rendered.body, sound: 'default' })),
        );
        return { channel, ok: true };
      }
      if (channel === 'SMS' && target.phone && adapters.sms) {
        await Sms.sendSms(adapters.sms, target.phone, `${rendered.title}: ${rendered.body}`);
        return { channel, ok: true };
      }
    } catch (e) {
      // try next channel
      continue;
    }
  }
  return { channel: preferred, ok: false, message: 'No channel succeeded' };
};
