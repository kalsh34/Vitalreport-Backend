import User from '../models/User.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const users = await User.find(query)
      .populate('role')
      .skip(skip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return ApiSuccess(res, {
      users,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch users', 500, 'FETCH_USERS_FAILED');
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role');

    if (!user) {
      return ApiError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    return ApiSuccess(res, user);
  } catch (error) {
    return ApiError(res, 'Failed to fetch user', 500, 'FETCH_USER_FAILED');
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return ApiError(res, 'Please provide all required fields', 400, 'MISSING_FIELDS');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return ApiError(res, 'Email already exists', 400, 'EMAIL_EXISTS');
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      createdBy: req.user._id
    });

    const populatedUser = await User.findById(user._id).populate('role');

    return ApiSuccess(res, populatedUser, 'User created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create user', 500, 'CREATE_USER_FAILED');
  }
};

export const updateUser = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return ApiError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return ApiError(res, 'Email already exists', 400, 'EMAIL_EXISTS');
      }
    }

    if (email) user.email = email;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const populatedUser = await User.findById(user._id).populate('role');

    return ApiSuccess(res, populatedUser, 'User updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update user', 500, 'UPDATE_USER_FAILED');
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return ApiError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    return ApiSuccess(res, null, 'User deactivated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to delete user', 500, 'DELETE_USER_FAILED');
  }
};
