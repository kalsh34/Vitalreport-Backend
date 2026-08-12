import PatrolRoute from '../models/PatrolRoute.js';
import PatrolCheckpoint from '../models/PatrolCheckpoint.js';
import PatrolEvent from '../models/PatrolEvent.js';
import PatrolSchedule from '../models/PatrolSchedule.js';
import Guard from '../models/Guard.js';
import Site from '../models/Site.js';
import Shift from '../models/Shift.js';
import { ApiSuccess, ApiError, paginate, generateId, calculateDistance } from '../utils/helpers.js';
import { v4 as uuidv4 } from 'uuid';

export const getRoutes = async (req, res) => {
  try {
    const { page = 1, limit = 20, site, search } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (site) query.site = site;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const routes = await PatrolRoute.find(query)
      .populate('site', 'name address')
      .skip(skip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await PatrolRoute.countDocuments(query);

    return ApiSuccess(res, {
      routes,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch routes', 500, 'FETCH_ROUTES_FAILED');
  }
};

export const createRoute = async (req, res) => {
  try {
    const { site, name, description, estimatedDuration } = req.body;

    if (!site || !name) {
      return ApiError(res, 'Site and name are required', 400, 'MISSING_FIELDS');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    const route = await PatrolRoute.create({
      site,
      name,
      description,
      estimatedDuration
    });

    const populatedRoute = await PatrolRoute.findById(route._id)
      .populate('site', 'name address');

    return ApiSuccess(res, populatedRoute, 'Route created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create route', 500, 'CREATE_ROUTE_FAILED');
  }
};

export const getCheckpoints = async (req, res) => {
  try {
    const { page = 1, limit = 20, route, site, search } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (route) query.route = route;
    if (site) query.site = site;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { qrCode: { $regex: search, $options: 'i' } }
      ];
    }

    const checkpoints = await PatrolCheckpoint.find(query)
      .populate('route', 'name description')
      .populate('site', 'name address')
      .skip(skip)
      .limit(queryLimit)
      .sort({ sortOrder: 1 });

    const total = await PatrolCheckpoint.countDocuments(query);

    return ApiSuccess(res, {
      checkpoints,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch checkpoints', 500, 'FETCH_CHECKPOINTS_FAILED');
  }
};

export const createCheckpoint = async (req, res) => {
  try {
    const { route, site, name, description, qrCode, latitude, longitude, sortOrder } = req.body;

    if (!route || !site || !name) {
      return ApiError(res, 'Route, site, and name are required', 400, 'MISSING_FIELDS');
    }

    const routeExists = await PatrolRoute.findById(route);
    if (!routeExists) {
      return ApiError(res, 'Route not found', 404, 'ROUTE_NOT_FOUND');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    const finalQrCode = qrCode || uuidv4();

    const checkpoint = await PatrolCheckpoint.create({
      route,
      site,
      name,
      description,
      qrCode: finalQrCode,
      latitude,
      longitude,
      sortOrder: sortOrder || 0
    });

    const populatedCheckpoint = await PatrolCheckpoint.findById(checkpoint._id)
      .populate('route', 'name')
      .populate('site', 'name');

    return ApiSuccess(res, populatedCheckpoint, 'Checkpoint created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create checkpoint', 500, 'CREATE_CHECKPOINT_FAILED');
  }
};

export const getPatrolEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, guard, site, shift, checkpoint, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (guard) query.guard = guard;
    if (site) query.site = site;
    if (shift) query.shift = shift;
    if (checkpoint) query.checkpoint = checkpoint;

    if (startDate || endDate) {
      query.scannedAt = {};
      if (startDate) query.scannedAt.$gte = new Date(startDate);
      if (endDate) query.scannedAt.$lte = new Date(endDate);
    }

    const events = await PatrolEvent.find(query)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('checkpoint', 'name qrCode')
      .populate('route', 'name')
      .skip(skip)
      .limit(queryLimit)
      .sort({ scannedAt: -1 });

    const total = await PatrolEvent.countDocuments(query);

    return ApiSuccess(res, {
      events,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch patrol events', 500, 'FETCH_PATROL_EVENTS_FAILED');
  }
};

export const scanCheckpoint = async (req, res) => {
  try {
    const { guardId, qrCode, latitude, longitude, accuracyM, deviceId } = req.body;

    if (!guardId || !qrCode) {
      return ApiError(res, 'Guard ID and QR code are required', 400, 'MISSING_FIELDS');
    }

    const guard = await Guard.findById(guardId)
      .populate('assignedSite', 'name location geofenceRadius');

    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const activeShift = await Shift.findOne({
      guard: guardId,
      status: 'ACTIVE'
    });

    if (!activeShift) {
      return ApiError(res, 'No active shift for this guard', 403, 'SHIFT_NOT_ACTIVE');
    }

    const checkpoint = await PatrolCheckpoint.findOne({ qrCode, status: 'ACTIVE' })
      .populate('site', 'name location geofenceRadius')
      .populate('route', 'name');

    if (!checkpoint) {
      return ApiSuccess(res, { success: false, reason: 'INVALID_CHECKPOINT' }, 'Checkpoint not found or inactive');
    }

    if (guard.assignedSite && checkpoint.site._id.toString() !== guard.assignedSite._id.toString()) {
      return ApiSuccess(res, { success: false, reason: 'SITE_MISMATCH' }, 'Checkpoint not at assigned site');
    }

    let geofenceStatus = 'INSIDE_GEOFENCE';
    if (latitude !== undefined && longitude !== undefined && checkpoint.latitude && checkpoint.longitude) {
      const distance = calculateDistance(latitude, longitude, checkpoint.latitude, checkpoint.longitude);
      if (distance > 50) {
        geofenceStatus = 'OUTSIDE_GEOFENCE';
      }
    }

    const patrolEvent = await PatrolEvent.create({
      guard: guardId,
      site: guard.assignedSite?._id || checkpoint.site._id,
      shift: activeShift._id,
      route: checkpoint.route?._id,
      checkpoint: checkpoint._id,
      checkpointName: checkpoint.name,
      location: latitude !== undefined && longitude !== undefined ? {
        type: 'Point',
        coordinates: [longitude, latitude]
      } : undefined,
      latitude,
      longitude,
      accuracyM,
      geofenceStatus,
      deviceId
    });

    return ApiSuccess(res, {
      success: true,
      event: {
        _id: patrolEvent._id,
        checkpointName: checkpoint.name,
        scannedAt: patrolEvent.scannedAt,
        geofenceStatus
      }
    }, 'Checkpoint scanned successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to scan checkpoint', 500, 'SCAN_CHECKPOINT_FAILED');
  }
};

export const getPatrolCompliance = async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;

    if (!site) {
      return ApiError(res, 'Site is required', 400, 'MISSING_SITE');
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    const totalScheduled = await PatrolSchedule.countDocuments({
      site,
      scheduledTime: { $gte: start, $lte: end },
      isActive: true
    });

    const completedEvents = await PatrolEvent.countDocuments({
      site,
      scannedAt: { $gte: start, $lte: end }
    });

    const routes = await PatrolRoute.find({ site, status: 'ACTIVE' });

    const routeCompliance = await Promise.all(routes.map(async (route) => {
      const scheduled = await PatrolSchedule.countDocuments({
        route: route._id,
        site,
        scheduledTime: { $gte: start, $lte: end },
        isActive: true
      });

      const completed = await PatrolEvent.countDocuments({
        route: route._id,
        site,
        scannedAt: { $gte: start, $lte: end }
      });

      return {
        routeId: route._id,
        routeName: route.name,
        scheduled,
        completed,
        missed: Math.max(0, scheduled - completed),
        compliancePercent: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 100
      };
    }));

    const overallCompliance = totalScheduled > 0
      ? Math.round((completedEvents / totalScheduled) * 100)
      : 100;

    return ApiSuccess(res, {
      period: { start, end },
      overall: {
        scheduled: totalScheduled,
        completed: completedEvents,
        missed: Math.max(0, totalScheduled - completedEvents),
        compliancePercent: overallCompliance
      },
      byRoute: routeCompliance
    });
  } catch (error) {
    return ApiError(res, 'Failed to calculate patrol compliance', 500, 'PATROL_COMPLIANCE_FAILED');
  }
};
