import Guard from '../models/Guard.js';
import GuardLocation from '../models/GuardLocation.js';
import Shift from '../models/Shift.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, calculateDistance, paginate } from '../utils/helpers.js';
import { ONLINE_THRESHOLD_MINUTES, STALE_THRESHOLD_MINUTES } from '../utils/constants.js';

export const submitLocation = async (req, res) => {
  try {
    const { guardId, latitude, longitude, accuracyM, batteryLevel, networkStatus, deviceId, recordedAt } = req.body;

    if (!guardId || latitude === undefined || longitude === undefined) {
      return ApiError(res, 'Guard ID, latitude, and longitude are required', 400, 'MISSING_FIELDS');
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
      return ApiError(res, 'No active shift. GPS tracking requires an active shift.', 403, 'SHIFT_NOT_ACTIVE');
    }

    let locationStatus = 'INSIDE_GEOFENCE';
    let distanceFromSiteM = null;

    if (guard.assignedSite && guard.assignedSite.location && guard.assignedSite.location.coordinates) {
      const siteLng = guard.assignedSite.location.coordinates[0];
      const siteLat = guard.assignedSite.location.coordinates[1];
      const geofenceRadius = guard.assignedSite.geofenceRadius || 200;

      distanceFromSiteM = calculateDistance(latitude, longitude, siteLat, siteLng);

      if (distanceFromSiteM > geofenceRadius) {
        locationStatus = 'OUTSIDE_GEOFENCE';
      }
    }

    const locationData = {
      guard: guardId,
      site: guard.assignedSite?._id || undefined,
      shift: activeShift._id,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      latitude,
      longitude,
      accuracyM,
      batteryLevel,
      networkStatus,
      deviceId,
      locationStatus,
      distanceFromSiteM,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date()
    };

    const guardLocation = await GuardLocation.create(locationData);

    guard.lastLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    guard.device = {
      ...guard.device,
      deviceId,
      batteryLevel,
      networkStatus,
      lastSeen: new Date()
    };
    await guard.save({ validateBeforeSave: false });

    let io = null;
    try {
      if (global.io) {
        io = global.io;
        io.to(`site:${guard.assignedSite?._id}`).emit('locationUpdate', {
          guardId: guard._id,
          employeeId: guard.employeeId,
          firstName: guard.firstName,
          lastName: guard.lastName,
          latitude,
          longitude,
          locationStatus,
          distanceFromSiteM,
          recordedAt: guardLocation.recordedAt
        });
      }
    } catch (socketError) {
      // Socket not available, continue
    }

    return ApiSuccess(res, {
      locationId: guardLocation._id,
      locationStatus,
      distanceFromSiteM,
      recordedAt: guardLocation.recordedAt
    }, 'Location recorded successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to submit location', 500, 'LOCATION_SUBMIT_FAILED');
  }
};

export const getGuardLocation = async (req, res) => {
  try {
    const guard = await Guard.findById(req.params.id);
    if (!guard) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const lastLocation = await GuardLocation.findOne({ guard: req.params.id })
      .sort({ recordedAt: -1 })
      .populate('site', 'name address')
      .populate('shift', 'startTime endTime status');

    if (!lastLocation) {
      return ApiSuccess(res, null, 'No location data available');
    }

    return ApiSuccess(res, lastLocation);
  } catch (error) {
    return ApiError(res, 'Failed to fetch guard location', 500, 'FETCH_LOCATION_FAILED');
  }
};

export const getLiveLocations = async (req, res) => {
  try {
    const now = new Date();
    const guards = await Guard.find({ status: { $in: ['ON_DUTY', 'STALE', 'OFFLINE', 'OUTSIDE_GEOFENCE'] } })
      .populate('assignedSite', 'name address location geofenceRadius')
      .lean();

    const liveData = await Promise.all(guards.map(async (guard) => {
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
        lastLocation: lastLocation ? {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          locationStatus: lastLocation.locationStatus,
          distanceFromSiteM: lastLocation.distanceFromSiteM,
          recordedAt: lastLocation.recordedAt
        } : null,
        lastUpdateMinutesAgo,
        assignedSite: guard.assignedSite,
        activeShift: activeShift ? {
          _id: activeShift._id,
          startTime: activeShift.startTime,
          endTime: activeShift.endTime
        } : null
      };
    }));

    return ApiSuccess(res, liveData);
  } catch (error) {
    return ApiError(res, 'Failed to fetch live locations', 500, 'LIVE_LOCATIONS_FAILED');
  }
};
