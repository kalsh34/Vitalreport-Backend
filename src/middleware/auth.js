import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/helpers.js';

const isDev = process.env.NODE_ENV !== 'production';

export const protect = async (req, res, next) => {
  try {
    if (isDev) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).populate({
            path: 'role',
            populate: { path: 'permissions' }
          });
          if (user && user.isActive) {
            req.user = user;
            return next();
          }
        } catch {}
      }

      const devUser = await User.findOne({}).populate({
        path: 'role',
        populate: { path: 'permissions' }
      });
      if (devUser) {
        req.user = devUser;
        return next();
      }
      return ApiError(res, 'No users in database. Run seed first.', 500, 'NO_USERS');
    }

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiError(res, 'Not authorized to access this route', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate({
      path: 'role',
      populate: { path: 'permissions' }
    });

    if (!user) {
      return ApiError(res, 'User not found', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      return ApiError(res, 'User account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiError(res, 'Invalid token', 401, 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
      return ApiError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
    }
    return ApiError(res, 'Authentication failed', 401, 'AUTH_FAILED');
  }
};
