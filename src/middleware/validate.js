import { ApiError } from '../utils/helpers.js';

export const validate = (validatorFn) => {
  return (req, res, next) => {
    try {
      const errors = validatorFn(req.body);

      if (errors && Object.keys(errors).length > 0) {
        const message = Object.values(errors).flat().join(', ');
        return ApiError(res, message, 400, 'VALIDATION_ERROR');
      }

      next();
    } catch (error) {
      return ApiError(res, 'Validation failed', 400, 'VALIDATION_ERROR');
    }
  };
};
