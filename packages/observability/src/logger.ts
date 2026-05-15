import pino from 'pino';

export interface LoggerOptions {
  service: string;
  level?: pino.Level;
  pretty?: boolean;
}

/**
 * Pino is the standard logger across all PCN services. We use:
 *   - structured JSON in prod
 *   - pino-pretty in dev for readability
 *   - automatic redaction of secrets (auth headers, payment payloads)
 */
export const createLogger = (opts: LoggerOptions): pino.Logger =>
  pino({
    name: opts.service,
    level: opts.level ?? (process.env.LOG_LEVEL as pino.Level) ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.passwordHash',
        '*.secret',
        '*.token',
        '*.access_token',
        '*.refresh_token',
        '*.HashSecret',
        '*.SecretKey',
      ],
      remove: true,
    },
    ...(opts.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });

export type Logger = pino.Logger;
