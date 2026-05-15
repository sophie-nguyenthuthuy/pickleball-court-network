import { randomBytes, randomUUID } from 'node:crypto';

export function uuid(): string {
  return randomUUID();
}

const HUMAN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

/**
 * Generates a public booking code like "PCN-2026-AB12CD".
 * Year is fixed at code time; collision risk per year is negligible at our scale.
 */
export function bookingCode(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const bytes = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) {
    const byte = bytes[i] ?? 0;
    out += HUMAN_ALPHABET[byte % HUMAN_ALPHABET.length];
  }
  return `PCN-${year}-${out}`;
}

/**
 * Generates an opaque idempotency key for clients that did not supply one.
 * Clients SHOULD supply their own keys; this is a safety net.
 */
export function idempotencyKey(prefix = 'idem'): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}
