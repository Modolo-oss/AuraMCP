import { FastifyRequest, FastifyReply } from 'fastify';
import { extractTokenFromHeader, verifyToken, JWTPayload } from './jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token. Please sign in again.',
    });
  }

  request.user = payload;
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      request.user = payload;
    }
  }
}
