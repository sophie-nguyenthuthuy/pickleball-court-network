import { errors } from '@pcn/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthContext {
  userId: string;
  roles: Array<'PLAYER' | 'COURT_OWNER' | 'STAFF' | 'ADMIN'>;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export const requireAuth = async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  try {
    await req.jwtVerify();
    const payload = req.user as { sub: string; roles?: string[] };
    req.auth = {
      userId: payload.sub,
      roles: (payload.roles ?? ['PLAYER']) as AuthContext['roles'],
    };
  } catch {
    throw errors.unauthorized();
  }
};

export const requireRole =
  (...allowed: AuthContext['roles']) =>
  async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(req, reply);
    const has = req.auth!.roles.some((r) => allowed.includes(r));
    if (!has) throw errors.forbidden();
  };
