import { ApiError } from '../utils/helpers.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return ApiError(res, 'Not authorized', 403, 'FORBIDDEN');
    }

    const userRoleName = req.user.role.name;

    if (allowedRoles.includes(userRoleName)) {
      return next();
    }

    return ApiError(res, 'Insufficient permissions for this action', 403, 'INSUFFICIENT_ROLE');
  };
};

export const checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return ApiError(res, 'Not authorized', 403, 'FORBIDDEN');
    }

    const userPermissions = req.user.role.permissions.map(p => p.name);

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (hasPermission) {
      return next();
    }

    return ApiError(res, 'Insufficient permissions for this action', 403, 'INSUFFICIENT_PERMISSION');
  };
};
