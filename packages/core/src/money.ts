/**
 * VND has no minor units in everyday use. All money in this codebase is BIGINT VND.
 * These helpers exist to make intent explicit and prevent accidental Number coercion.
 */

export type Vnd = bigint;

export const vnd = (amount: number | bigint): Vnd =>
  typeof amount === 'bigint' ? amount : BigInt(Math.round(amount));

export const sum = (...amounts: Vnd[]): Vnd => amounts.reduce((acc, a) => acc + a, 0n);

/** Platform fee in basis points (e.g. 1000 = 10%). */
export const applyBps = (amount: Vnd, bps: number): Vnd => (amount * BigInt(bps)) / 10000n;

export const formatVnd = (amount: Vnd): string => {
  const n = Number(amount);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
};
