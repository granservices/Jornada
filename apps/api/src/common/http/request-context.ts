import type { Request } from 'express';

export type HttpRequestContext = {
  ipAddress?: string;
  userAgent?: string | string[];
  requestId?: string;
};

export function getRequestContext(
  request: Request & { id?: string },
  ipAddress?: string,
): HttpRequestContext {
  return {
    ipAddress,
    userAgent: request.headers['user-agent'],
    requestId: resolveRequestId(request),
  };
}

function resolveRequestId(request: Request & { id?: string }) {
  if (typeof request.id === 'string' && request.id.trim().length > 0) {
    return request.id;
  }

  const headerValue = request.headers['x-request-id'];
  return typeof headerValue === 'string' ? headerValue : undefined;
}
