import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Guard from '../models/Guard.js';
import { ApiSuccess, ApiError } from '../utils/helpers.js';

const isDev = process.env.NODE_ENV !== 'production';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiError(res, 'Please provide email and password', 400, 'MISSING_CREDENTIALS');
    }

    const user = await User.findOne({ email }).select('+password').populate({
      path: 'role',
      populate: { path: 'permissions' }
    });

    if (!user) {
      return ApiError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return ApiError(res, 'Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    if (!isDev) {
      try {
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return ApiError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
      } catch (err) {
        console.error('Password compare error:', err.message);
        return ApiError(res, 'Authentication error', 500, 'AUTH_ERROR');
      }
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = generateToken(user._id);

    const userObj = user.toObject();
    delete userObj.password;

    // Attach guard profile if user is a guard
    const guard = await Guard.findOne({ user: user._id })
      .populate('assignedSite', 'name address location geofenceRadius status')
      .populate('assignedPost', 'name description status')
      .populate('assignedShift', 'startTime endTime status');

    if (guard) {
      userObj.guard = guard;
    }

    return ApiSuccess(res, {
      token,
      user: userObj
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error.message);
    return ApiError(res, error.message || 'Login failed', 500, 'LOGIN_FAILED');
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'role',
      populate: { path: 'permissions' }
    });

    if (!user) {
      return ApiError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    const userData = {
      id: user._id,
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      permissions: user.role?.permissions || [],
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    // Attach guard profile if user is a guard
    const guard = await Guard.findOne({ user: user._id })
      .populate('assignedSite', 'name address location geofenceRadius status')
      .populate('assignedPost', 'name description status')
      .populate('assignedShift', 'startTime endTime status');

    if (guard) {
      userData.guard = guard;
    }

    return ApiSuccess(res, userData);
  } catch (error) {
    console.error('GetMe error:', error.message);
    return ApiError(res, 'Failed to get user profile', 500, 'PROFILE_FETCH_FAILED');
  }
};

export const logout = async (req, res) => {
  try {
    return ApiSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    return ApiError(res, 'Logout failed', 500, 'LOGOUT_FAILED');
  }
};
