export function sendSuccess(
  res,
  { statusCode = 200, message = 'Success', data = null, meta } = {},
) {
  const payload = { success: true, message, data };
  if (meta !== undefined) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

export function sendCreated(res, data, message = 'Created successfully') {
  return sendSuccess(res, { statusCode: 201, message, data });
}
