/**
 * eSMS.vn brand-name SMS adapter. Primary use: phone OTP fallback when the
 * user hasn't linked Zalo. Brand-name SMS is required in VN for transactional
 * messages — register the brand with eSMS / FPT first.
 */
import { errors } from '@pcn/core/errors';

export interface EsmsConfig {
  apiKey: string;
  secretKey: string;
  brandName: string;
  endpoint?: string;
}

const DEFAULT_ENDPOINT = 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';

export const sendSms = async (cfg: EsmsConfig, phone: string, content: string): Promise<{ smsId: string }> => {
  const body = {
    ApiKey: cfg.apiKey,
    SecretKey: cfg.secretKey,
    Content: content,
    Phone: phone,
    SmsType: '2',
    Brandname: cfg.brandName,
    IsUnicode: '0',
  };
  const res = await fetch(cfg.endpoint ?? DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw errors.internal(`eSMS HTTP ${res.status}`);
  const json = (await res.json()) as { CodeResult?: string; SMSID?: string; ErrorMessage?: string };
  if (json.CodeResult !== '100') {
    throw errors.internal(`eSMS send failed: ${json.CodeResult} ${json.ErrorMessage}`);
  }
  return { smsId: json.SMSID ?? '' };
};
