import ApiError from '../utils/ApiError.js';

function formatValidationErrors(issues = []) {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

export function validate(schema) {
  return (req, _res, next) => {
    try {
      const input = {
        body: req.body ?? {},
        params: req.params ?? {},
        query: req.query ?? {},
      };

      const result = schema.safeParse(input);

      if (!result.success) {
        return next(
          new ApiError(
            422,
            'Dữ liệu không hợp lệ.',
            'VALIDATION_ERROR',
            formatValidationErrors(
              result.error.issues,
            ),
          ),
        );
      }

      /*
       * Lưu toàn bộ dữ liệu đã được Zod kiểm tra và chuyển đổi.
       *
       * Controller nên lấy:
       * req.validated.body
       * req.validated.params
       * req.validated.query
       */
      req.validated = {
        body: result.data.body ?? {},
        params: result.data.params ?? {},
        query: result.data.query ?? {},
      };

      /*
       * req.body và req.params có thể gán lại.
       * Giữ phần này để các controller cũ vẫn hoạt động.
       */
      req.body = req.validated.body;
      req.params = req.validated.params;

      /*
       * TUYỆT ĐỐI KHÔNG gán:
       *
       * req.query = req.validated.query;
       *
       * Vì req.query là getter read-only trong Express hiện tại.
       */

      return next();
    } catch (error) {
      return next(error);
    }
  };
}