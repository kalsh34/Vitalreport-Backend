import Guard from '../models/Guard.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Site from '../models/Site.js';
import Post from '../models/Post.js';
import Shift from '../models/Shift.js';
import GuardLocation from '../models/GuardLocation.js';
import { ApiSuccess, ApiError, paginate, generateId } from '../utils/helpers.js';
import { STALE_THRESHOLD_MINUTES, ONLINE_THRESHOLD_MINUTES, GUARD_STATUSES } from '../utils/constants.js';

export const getGuards = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, site, status, post, shift } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (site) query.assignedSite = site;
    if (status) query.status = status;
    if (post) query.assignedPost = post;
    if (shift) query.assignedShift = shift;

    const guards = await Guard.find(query)
      .populate('user', 'email firstName lastName phone isActive lastLogin')
      .populate('assignedSite', 'name address status')
      .populate('assignedPost', 'name description status')
      .populate('assignedShift', 'startTime endTime status')
      .skip(skip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await Guard.countDocuments(query);

    return ApiSuccess(res, {
      guards,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch guards', 500, 'FETCH_GUARDS_FAILED');
  }
};

export const getGuard = async (req, res) => {
  try {
    const guard = await Guard.findById(req.params.id)
      .populate('user', 'email firstName lastName phone isActive lastLogin profileImage')
      .populate('assignedSite', 'name address location geofenceRadius status')
      .populate('assignedPost', 'name description latitude longitude status')
      .populate('assignedShift', 'startTime endTime status site post');

    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    return ApiSuccess(res, guard);
  } catch (error) {
    return ApiError(res, 'Failed to fetch guard', 500, 'FETCH_GUARD_FAILED');
  }
};

export const createGuard = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, assignedSite, assignedPost, assignedShift, emergencyContact, device } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return ApiError(res, 'Please provide all required fields', 400, 'MISSING_FIELDS');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return ApiError(res, 'Email already exists', 400, 'EMAIL_EXISTS');
    }

    const guardRole = await Role.findOne({ name: 'GUARD' });
    if (!guardRole) {
      return ApiError(res, 'GUARD role not found', 500, 'GUARD_ROLE_NOT_FOUND');
    }

    if (assignedSite) {
      const site = await Site.findById(assignedSite);
      if (!site) {
        return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
      }
    }

    if (assignedPost) {
      const post = await Post.findById(assignedPost);
      if (!post) {
        return ApiError(res, 'Post not found', 404, 'POST_NOT_FOUND');
      }
    }

    const employeeId = `GRD-${generateId().substring(0, 8).toUpperCase()}`;

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: guardRole._id,
      createdBy: req.user._id
    });

    const guard = await Guard.create({
      user: user._id,
      employeeId,
      firstName,
      lastName,
      phone,
      assignedSite: assignedSite || undefined,
      assignedPost: assignedPost || undefined,
      assignedShift: assignedShift || undefined,
      emergencyContact: emergencyContact || undefined,
      device: device || undefined
    });

    const populatedGuard = await Guard.findById(guard._id)
      .populate('user', 'email firstName lastName phone')
      .populate('assignedSite', 'name address')
      .populate('assignedPost', 'name')
      .populate('assignedShift', 'startTime endTime status');

    return ApiSuccess(res, populatedGuard, 'Guard created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create guard', 500, 'CREATE_GUARD_FAILED');
  }
};

export const updateGuard = async (req, res) => {
  try {
    const { firstName, lastName, phone, assignedSite, assignedPost, assignedShift, status, device, emergencyContact } = req.body;

    const guard = await Guard.findById(req.params.id);
    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    if (firstName) guard.firstName = firstName;
    if (lastName) guard.lastName = lastName;
    if (phone !== undefined) guard.phone = phone;
    if (assignedSite !== undefined) guard.assignedSite = assignedSite || undefined;
    if (assignedPost !== undefined) guard.assignedPost = assignedPost || undefined;
    if (assignedShift !== undefined) guard.assignedShift = assignedShift || undefined;
    if (status) guard.status = status;
    if (device) guard.device = { ...guard.device, ...device };
    if (emergencyContact) guard.emergencyContact = { ...guard.emergencyContact, ...emergencyContact };

    await guard.save();

    if (firstName || lastName || phone) {
      await User.findByIdAndUpdate(guard.user, {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone })
      });
    }

    const populatedGuard = await Guard.findById(guard._id)
      .populate('user', 'email firstName lastName phone')
      .populate('assignedSite', 'name address')
      .populate('assignedPost', 'name')
      .populate('assignedShift', 'startTime endTime status');

    return ApiSuccess(res, populatedGuard, 'Guard updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update guard', 500, 'UPDATE_GUARD_FAILED');
  }
};

export const getGuardLiveStatus = async (req, res) => {
  try {
    const guard = await Guard.findById(req.params.id)
      .populate('assignedSite', 'name geofenceRadius location')
      .populate('assignedShift', 'startTime endTime status');

    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const now = new Date();
    const activeShift = guard.assignedShift && guard.assignedShift.status === 'ACTIVE';

    const lastLocation = await GuardLocation.findOne({ guard: guard._id })
      .sort({ recordedAt: -1 })
      .lean();

    let computedStatus = 'OFF_DUTY';
    let lastUpdateMinutesAgo = null;

    if (activeShift) {
      if (lastLocation) {
        const timeDiff = now - new Date(lastLocation.recordedAt);
        lastUpdateMinutesAgo = Math.round(timeDiff / 60000);

        if (lastUpdateMinutesAgo <= ONLINE_THRESHOLD_MINUTES) {
          computedStatus = lastLocation.locationStatus === 'OUTSIDE_GEOFENCE' ? 'OUTSIDE_GEOFENCE' : 'ON_DUTY';
        } else if (lastUpdateMinutesAgo <= STALE_THRESHOLD_MINUTES) {
          computedStatus = 'STALE';
        } else {
          computedStatus = 'OFFLINE';
        }
      } else {
        computedStatus = 'NO_LOCATION';
      }
    }

    return ApiSuccess(res, {
      guard: {
        _id: guard._id,
        employeeId: guard.employeeId,
        firstName: guard.firstName,
        lastName: guard.lastName,
        status: computedStatus,
        assignedSite: guard.assignedSite,
        assignedShift: guard.assignedShift
      },
      activeShift,
      lastLocation: lastLocation ? {
        latitude: lastLocation.latitude,
        longitude: lastLocation.longitude,
        locationStatus: lastLocation.locationStatus,
        distanceFromSiteM: lastLocation.distanceFromSiteM,
        recordedAt: lastLocation.recordedAt
      } : null,
      lastUpdateMinutesAgo,
      computedStatus
    });
  } catch (error) {
    return ApiError(res, 'Failed to get guard live status', 500, 'LIVE_STATUS_FAILED');
  }
};

export const getGuardLocations = async (req, res) => {
  try {
    const now = new Date();
    const guards = await Guard.find({ status: { $nin: ['SUSPENDED'] } })
      .populate('assignedSite', 'name geofenceRadius location')
      .lean();

    const guardStatuses = await Promise.all(guards.map(async (guard) => {
      const lastLocation = await GuardLocation.findOne({ guard: guard._id })
        .sort({ recordedAt: -1 })
        .lean();

      const activeShift = await Shift.findOne({
        guard: guard._id,
        status: 'ACTIVE'
      }).lean();

      let computedStatus = 'OFF_DUTY';
      let lastUpdateMinutesAgo = null;

      if (activeShift) {
        if (lastLocation) {
          const timeDiff = now - new Date(lastLocation.recordedAt);
          lastUpdateMinutesAgo = Math.round(timeDiff / 60000);

          if (lastUpdateMinutesAgo <= ONLINE_THRESHOLD_MINUTES) {
            computedStatus = lastLocation.locationStatus === 'OUTSIDE_GEOFENCE' ? 'OUTSIDE_GEOFENCE' : 'ON_DUTY';
          } else if (lastUpdateMinutesAgo <= STALE_THRESHOLD_MINUTES) {
            computedStatus = 'STALE';
          } else {
            computedStatus = 'OFFLINE';
          }
        } else {
          computedStatus = 'NO_LOCATION';
        }
      }

      return {
        guardId: guard._id,
        employeeId: guard.employeeId,
        firstName: guard.firstName,
        lastName: guard.lastName,
        computedStatus,
        activeShift: !!activeShift,
        lastLocation: lastLocation ? {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          locationStatus: lastLocation.locationStatus,
          distanceFromSiteM: lastLocation.distanceFromSiteM,
          recordedAt: lastLocation.recordedAt
        } : null,
        lastUpdateMinutesAgo,
        assignedSite: guard.assignedSite
      };
    }));

    return ApiSuccess(res, guardStatuses);
  } catch (error) {
    return ApiError(res, 'Failed to get guard locations', 500, 'GUARD_LOCATIONS_FAILED');
  }
};
