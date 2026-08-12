import Shift from '../models/Shift.js';
import Guard from '../models/Guard.js';
import Site from '../models/Site.js';
import Post from '../models/Post.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getShifts = async (req, res) => {
  try {
    const { page = 1, limit = 20, guard, site, startDate, endDate, status } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};

    if (guard) query.guard = guard;
    if (site) query.site = site;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const shifts = await Shift.find(query)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name')
      .populate('supervisor', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ startTime: -1 });

    const total = await Shift.countDocuments(query);

    return ApiSuccess(res, {
      shifts,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch shifts', 500, 'FETCH_SHIFTS_FAILED');
  }
};

export const getShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id)
      .populate('guard', 'employeeId firstName lastName phone status')
      .populate('site', 'name address location geofenceRadius')
      .populate('post', 'name description latitude longitude')
      .populate('supervisor', 'firstName lastName email');

    if (!shift) {
      return ApiError(res, 'Shift not found', 404, 'SHIFT_NOT_FOUND');
    }

    return ApiSuccess(res, shift);
  } catch (error) {
    return ApiError(res, 'Failed to fetch shift', 500, 'FETCH_SHIFT_FAILED');
  }
};

export const createShift = async (req, res) => {
  try {
    const { guard, site, post, startTime, endTime, supervisor, notes } = req.body;

    if (!guard || !site || !startTime || !endTime) {
      return ApiError(res, 'Guard, site, start time, and end time are required', 400, 'MISSING_FIELDS');
    }

    const guardExists = await Guard.findById(guard);
    if (!guardExists) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    if (post) {
      const postExists = await Post.findById(post);
      if (!postExists) {
        return ApiError(res, 'Post not found', 404, 'POST_NOT_FOUND');
      }
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return ApiError(res, 'End time must be after start time', 400, 'INVALID_TIME_RANGE');
    }

    const shift = await Shift.create({
      guard,
      site,
      post,
      startTime,
      endTime,
      supervisor,
      notes
    });

    const populatedShift = await Shift.findById(shift._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name');

    return ApiSuccess(res, populatedShift, 'Shift created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create shift', 500, 'CREATE_SHIFT_FAILED');
  }
};

export const updateShift = async (req, res) => {
  try {
    const { post, startTime, endTime, supervisor, notes, status } = req.body;

    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return ApiError(res, 'Shift not found', 404, 'SHIFT_NOT_FOUND');
    }

    if (post !== undefined) shift.post = post || undefined;
    if (startTime) shift.startTime = startTime;
    if (endTime) shift.endTime = endTime;
    if (supervisor !== undefined) shift.supervisor = supervisor || undefined;
    if (notes !== undefined) shift.notes = notes;
    if (status) shift.status = status;

    await shift.save();

    const populatedShift = await Shift.findById(shift._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name');

    return ApiSuccess(res, populatedShift, 'Shift updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update shift', 500, 'UPDATE_SHIFT_FAILED');
  }
};

export const startShift = async (req, res) => {
  try {
    const guardId = req.params.id;

    const guard = await Guard.findById(guardId);
    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const activeShift = await Shift.findOne({
      guard: guardId,
      status: 'ACTIVE'
    });

    if (activeShift) {
      return ApiError(res, 'Guard already has an active shift', 400, 'SHIFT_ALREADY_ACTIVE');
    }

    const now = new Date();
    const scheduledShift = await Shift.findOne({
      guard: guardId,
      status: 'SCHEDULED',
      startTime: { $lte: now },
      endTime: { $gt: now }
    }).sort({ startTime: -1 });

    if (!scheduledShift) {
      const upcomingShift = await Shift.findOne({
        guard: guardId,
        status: 'SCHEDULED',
        startTime: { $gt: now }
      }).sort({ startTime: 1 });

      if (upcomingShift) {
        return ApiError(res, `No active shift found. Next shift starts at ${upcomingShift.startTime.toISOString()}`, 400, 'NO_ACTIVE_SHIFT_SCHEDULED');
      }

      return ApiError(res, 'No scheduled shift found for this guard', 400, 'NO_SCHEDULED_SHIFT');
    }

    scheduledShift.status = 'ACTIVE';
    scheduledShift.startedAt = now;
    await scheduledShift.save();

    guard.status = 'ON_DUTY';
    guard.assignedShift = scheduledShift._id;
    await guard.save({ validateBeforeSave: false });

    const populatedShift = await Shift.findById(scheduledShift._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name');

    return ApiSuccess(res, populatedShift, 'Shift started successfully');
  } catch (error) {
    return ApiError(res, 'Failed to start shift', 500, 'START_SHIFT_FAILED');
  }
};

export const endShift = async (req, res) => {
  try {
    const guardId = req.params.id;

    const guard = await Guard.findById(guardId);
    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const activeShift = await Shift.findOne({
      guard: guardId,
      status: 'ACTIVE'
    });

    if (!activeShift) {
      return ApiError(res, 'No active shift found for this guard', 400, 'NO_ACTIVE_SHIFT');
    }

    const now = new Date();
    activeShift.status = 'COMPLETED';
    activeShift.endedAt = now;
    await activeShift.save();

    guard.status = 'OFF_DUTY';
    guard.assignedShift = undefined;
    await guard.save({ validateBeforeSave: false });

    const populatedShift = await Shift.findById(activeShift._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name');

    return ApiSuccess(res, populatedShift, 'Shift ended successfully');
  } catch (error) {
    return ApiError(res, 'Failed to end shift', 500, 'END_SHIFT_FAILED');
  }
};
