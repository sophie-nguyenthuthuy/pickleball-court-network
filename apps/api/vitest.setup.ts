// Vitest setup: stub required env vars so module-level env.parse() succeeds.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://pcn:pcn@localhost:5432/pcn_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.PUBLIC_API_URL ??= 'http://localhost:4000';
process.env.JWT_SECRET ??= 'test-secret-32-bytes-of-data-aaaaaa';
process.env.HASH_PEPPER ??= 'test-pepper-16chars';
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_BUCKET ??= 'pcn-media';
process.env.S3_ACCESS_KEY ??= 'minioadmin';
process.env.S3_SECRET_KEY ??= 'minioadmin';
