import Site from '../models/Site.js';
import Guard from '../models/Guard.js';
import Shift from '../models/Shift.js';
import PatrolEvent from '../models/PatrolEvent.js';
import Incident from '../models/Incident.js';
import AESEvent from '../models/AESEvent.js';
import GuardReport from '../models/GuardReport.js';
import { ApiSuccess, ApiError } from '../utils/helpers.js';
import { ONLINE_THRESHOLD_MINUTES, STALE_THRESHOLD_MINUTES } from '../utils/constants.js';

export const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const [
      activeSites,
      totalGuards,
      activeShifts,
      openIncidents,
      criticalIncidents,
      activeAlarms,
      pendingReports,
      todayPatrols
    ] = await Promise.all([
      Site.countDocuments({ status: 'ACTIVE' }),
      Guard.countDocuments({ isActive: true }),
      Shift.countDocuments({ status: 'ACTIVE' }),
      Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] } }),
      Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] }, severity: 'CRITICAL' }),
      AESEvent.countDocuments({ status: { $in: ['RECEIVED', 'VERIFIED', 'ESCALATED'] } }),
      GuardReport.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      PatrolEvent.countDocuments({ scannedAt: { $gte: startOfDay, $lte: endOfDay } })
    ]);

    const guards = await Guard.find({ isActive: true }).lean();
    let guardsOnDuty = 0;
    let guardsOnline = 0;
    let guardsOffline = 0;
    let outsideGeofence = 0;

    for (const guard of guards) {
      if (guard.status === 'ON_DUTY') {
        guardsOnDuty++;
        guardsOnline++;
      } else if (guard.status === 'STALE') {
        guardsOnDuty++;
        guardsOffline++;
      } else if (guard.status === 'OFFLINE') {
        guardsOnDuty++;
        guardsOffline++;
      } else if (guard.status === 'OUTSIDE_GEOFENCE') {
        guardsOnDuty++;
        outsideGeofence++;
      }
    }

    return ApiSuccess(res, {
      activeSites,
      totalGuards,
      guardsOnDuty,
      guardsOnline,
      guardsOffline,
      outsideGeofence,
      activeShifts,
      activePatrols: todayPatrols,
      openIncidents,
      criticalIncidents,
      activeAlarms,
      pendingReports,
      lastUpdated: new Date()
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch dashboard data', 500, 'DASHBOARD_FAILED');
  }
};

export const getLiveDashboard = async (req, res) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - STALE_THRESHOLD_MINUTES * 60000);
    const twoMinutesAgo = new Date(now.getTime() - ONLINE_THRESHOLD_MINUTES * 60000);

    const [
      activeSites,
      activeShifts,
      openIncidents,
      criticalIncidents,
      activeAlarms,
      pendingReports
    ] = await Promise.all([
      Site.countDocuments({ status: 'ACTIVE' }),
      Shift.countDocuments({ status: 'ACTIVE' }),
      Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] } }),
      Incident.countDocuments({ severity: 'CRITICAL', status: { $in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] } }),
      AESEvent.countDocuments({ status: { $in: ['RECEIVED', 'VERIFIED', 'ESCALATED'] } }),
      GuardReport.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } })
    ]);

    const guards = await Guard.find({ isActive: true })
      .populate('assignedSite', 'name')
      .lean();

    let guardsOnDuty = 0;
    let guardsOnline = 0;
    let guardsOffline = 0;
    let outsideGeofence = 0;

    for (const guard of guards) {
      const hasActiveShift = activeShifts > 0;
      if (hasActiveShift) {
        guardsOnDuty++;
        if (guard.status === 'ON_DUTY' || guard.status === 'OUTSIDE_GEOFENCE') {
          guardsOnline++;
        } else {
          guardsOffline++;
        }
        if (guard.status === 'OUTSIDE_GEOFENCE') {
          outsideGeofence++;
        }
      }
    }

    const todayPatrols = await PatrolEvent.countDocuments({
      scannedAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) }
    });

    return ApiSuccess(res, {
      activeSites,
      totalGuards: guards.length,
      guardsOnDuty,
      guardsOnline,
      guardsOffline,
      outsideGeofence,
      activeShifts,
      activePatrols: todayPatrols,
      openIncidents,
      criticalIncidents,
      activeAlarms,
      pendingReports,
      lastUpdated: new Date()
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch live dashboard', 500, 'LIVE_DASHBOARD_FAILED');
  }
};
