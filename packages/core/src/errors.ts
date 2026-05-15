export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SLOT_UNAVAILABLE'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_SIGNATURE_INVALID'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL';

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new DomainError('VALIDATION_FAILED', message, 400, details),
  notFound: (entity: string, id?: string) =>
    new DomainError('NOT_FOUND', `${entity} not found${id ? `: ${id}` : ''}`, 404),
  conflict: (message: string) => new DomainError('CONFLICT', message, 409),
  slotUnavailable: (message = 'Time slot is no longer available') =>
    new DomainError('SLOT_UNAVAILABLE', message, 409),
  paymentFailed: (message: string, details?: Record<string, unknown>) =>
    new DomainError('PAYMENT_FAILED', message, 402, details),
  paymentSignatureInvalid: () =>
    new DomainError('PAYMENT_SIGNATURE_INVALID', 'Webhook signature failed verification', 400),
  unauthorized: (message = 'Unauthorized') => new DomainError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'Forbidden') => new DomainError('FORBIDDEN', message, 403),
  rateLimited: (message = 'Too many requests') => new DomainError('RATE_LIMITED', message, 429),
  idempotencyConflict: () =>
    new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with a different payload', 409),
  internal: (message = 'Internal error') => new DomainError('INTERNAL', message, 500),
};
