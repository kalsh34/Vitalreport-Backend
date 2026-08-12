import Role from '../models/Role.js';
import User from '../models/User.js';
import { ApiSuccess, ApiError } from '../utils/helpers.js';

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate('permissions').sort({ name: 1 });

    return ApiSuccess(res, roles);
  } catch (error) {
    return ApiError(res, 'Failed to fetch roles', 500, 'FETCH_ROLES_FAILED');
  }
};

export const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('permissions');

    if (!role) {
      return ApiError(res, 'Role not found', 404, 'ROLE_NOT_FOUND');
    }

    return ApiSuccess(res, role);
  } catch (error) {
    return ApiError(res, 'Failed to fetch role', 500, 'FETCH_ROLE_FAILED');
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return ApiError(res, 'Role name is required', 400, 'MISSING_NAME');
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return ApiError(res, 'Role name already exists', 400, 'ROLE_EXISTS');
    }

    const role = await Role.create({
      name,
      description,
      permissions: permissions || []
    });

    const populatedRole = await Role.findById(role._id).populate('permissions');

    return ApiSuccess(res, populatedRole, 'Role created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create role', 500, 'CREATE_ROLE_FAILED');
  }
};

export const updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return ApiError(res, 'Role not found', 404, 'ROLE_NOT_FOUND');
    }

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return ApiError(res, 'Role name already exists', 400, 'ROLE_EXISTS');
      }
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;

    await role.save();

    const populatedRole = await Role.findById(role._id).populate('permissions');

    return ApiSuccess(res, populatedRole, 'Role updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update role', 500, 'UPDATE_ROLE_FAILED');
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return ApiError(res, 'Role not found', 404, 'ROLE_NOT_FOUND');
    }

    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return ApiError(res, 'Cannot delete role with assigned users', 400, 'ROLE_IN_USE');
    }

    await Role.findByIdAndDelete(role._id);

    return ApiSuccess(res, null, 'Role deleted successfully');
  } catch (error) {
    return ApiError(res, 'Failed to delete role', 500, 'DELETE_ROLE_FAILED');
  }
};
