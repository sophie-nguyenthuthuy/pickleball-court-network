-- Prevent overlapping bookings on the same court for live (non-cancelled, non-expired) statuses.
-- We use a partial EXCLUDE constraint on tstzrange so Postgres rejects double-booking at the DB layer.

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING GIST (
    "courtId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'));

-- Same idea for short-lived holds during payment.
ALTER TABLE "BookingHold"
  ADD CONSTRAINT booking_hold_no_overlap
  EXCLUDE USING GIST (
    "courtId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("expiresAt" > NOW());

-- Geospatial index for venue proximity search (PostGIS).
CREATE INDEX IF NOT EXISTS venue_geog_gix ON "Venue" USING GIST (geog);

-- Trigram index for venue name + address search.
CREATE INDEX IF NOT EXISTS venue_name_trgm ON "Venue" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS venue_addr_trgm ON "Venue" USING GIN ("addressLine" gin_trgm_ops);

-- Maintain Venue.geog from latitude/longitude on insert/update.
CREATE OR REPLACE FUNCTION venue_geog_sync() RETURNS trigger AS $$
BEGIN
  NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS venue_geog_sync_trg ON "Venue";
CREATE TRIGGER venue_geog_sync_trg
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "Venue"
  FOR EACH ROW EXECUTE FUNCTION venue_geog_sync();
