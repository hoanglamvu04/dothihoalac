import ApiError from '../utils/ApiError.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return next(new ApiError(422, 'Dữ liệu không hợp lệ.', 'VALIDATION_ERROR', details));
    }
    req.validated = result.data;
    req.body = result.data.body;
    req.params = result.data.params;
    return next();
  };
}
