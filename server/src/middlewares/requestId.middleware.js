import crypto from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const requestId = req.get('X-Request-Id') || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
