/**
 * Lightweight in-memory factories for unit tests that don't want to spin up
 * Postgres. Integration tests should use the seed script + a real DB.
 */
import { uuid } from '@pcn/core';

type Sport = 'PICKLEBALL' | 'PADEL';

export interface UserFactoryOpts {
  id?: string;
  phone?: string;
  displayName?: string;
  city?: string;
}

let userCounter = 0;
export const userFactory = (opts: UserFactoryOpts = {}) => {
  userCounter++;
  return {
    id: opts.id ?? uuid(),
    phone: opts.phone ?? `+8490900${String(userCounter).padStart(4, '0')}`,
    displayName: opts.displayName ?? `Test User ${userCounter}`,
    slug: `test-user-${userCounter}`,
    city: opts.city ?? 'Hồ Chí Minh',
  };
};

let venueCounter = 0;
export const venueFactory = (opts: { ownerId: string; sports?: Sport[]; name?: string } = { ownerId: 'owner' }) => {
  venueCounter++;
  return {
    id: uuid(),
    ownerId: opts.ownerId,
    name: opts.name ?? `Venue ${venueCounter}`,
    slug: `venue-${venueCounter}`,
    sports: opts.sports ?? (['PICKLEBALL'] as Sport[]),
    addressLine: '12 Demo St',
    district: 'Quận 1',
    city: 'Hồ Chí Minh',
    latitude: 10.78,
    longitude: 106.7,
  };
};

let courtCounter = 0;
export const courtFactory = (opts: { venueId: string; name?: string; sport?: Sport } = { venueId: 'venue' }) => {
  courtCounter++;
  return {
    id: uuid(),
    venueId: opts.venueId,
    name: opts.name ?? `Sân ${courtCounter}`,
    sport: opts.sport ?? ('PICKLEBALL' as Sport),
    surface: 'ACRYLIC' as const,
    kind: 'OUTDOOR' as const,
  };
};
