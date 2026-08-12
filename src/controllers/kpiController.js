import KPISnapshot from '../models/KPISnapshot.js';
import Guard from '../models/Guard.js';
import Shift from '../models/Shift.js';
import PatrolEvent from '../models/PatrolEvent.js';
import PatrolSchedule from '../models/PatrolSchedule.js';
import GuardReport from '../models/GuardReport.js';
import RadioCommunication from '../models/RadioCommunication.js';
import AESEvent from '../models/AESEvent.js';
import Incident from '../models/Incident.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';
import { GUARD_ACCOUNTABILITY_WEIGHTS, CONTROL_ROOM_SCORE_WEIGHTS, KPI_THRESHOLDS, TARGETS } from '../utils/constants.js';

export const getKPIs = async (req, res) => {
  try {
    const { page = 1, limit = 20, period, site, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (period) query.period = period;
    if (site) query.site = site;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const kpis = await KPISnapshot.find(query)
      .populate('site', 'name address')
      .skip(skip)
      .limit(queryLimit)
      .sort({ date: -1 });

    const total = await KPISnapshot.countDocuments(query);

    return ApiSuccess(res, {
      kpis,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch KPIs', 500, 'FETCH_KPIS_FAILED');
  }
};

export const getGuardAccountability = async (req, res) => {
  try {
    const { guardId, site, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    let guards = [];
    if (guardId) {
      const guard = await Guard.findById(guardId);
      if (!guard) {
        return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
      }
      guards = [guard];
    } else {
      const query = { isActive: true };
      if (site) query.assignedSite = site;
      guards = await Guard.find(query);
    }

    const accountabilityScores = await Promise.all(guards.map(async (guard) => {
      const qrScore = await calculateQRScore(guard._id, site, start, end);
      const attendanceScore = await calculateAttendanceScore(guard._id, start, end);
      const communicationScore = await calculateCommunicationScore(guard._id, site, start, end);
      const reportingScore = await calculateReportingScore(guard._id, start, end);

      const totalScore = Math.round(
        (qrScore * GUARD_ACCOUNTABILITY_WEIGHTS.qrPatrol +
         attendanceScore * GUARD_ACCOUNTABILITY_WEIGHTS.attendance +
         communicationScore * GUARD_ACCOUNTABILITY_WEIGHTS.communication +
         reportingScore * GUARD_ACCOUNTABILITY_WEIGHTS.reporting) / 100
      );

      return {
        guardId: guard._id,
        employeeId: guard.employeeId,
        firstName: guard.firstName,
        lastName: guard.lastName,
        qrPatrol: qrScore,
        attendance: attendanceScore,
        communication: communicationScore,
        reporting: reportingScore,
        totalScore
      };
    }));

    return ApiSuccess(res, {
      period: { start, end },
      guards: accountabilityScores
    });
  } catch (error) {
    return ApiError(res, 'Failed to calculate guard accountability', 500, 'GUARD_ACCOUNTABILITY_FAILED');
  }
};

export const getControlRoomScore = async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const guardAccountability = await calculateOverallGuardAccountability(site, start, end);
    const alarmEmergencyResponse = await calculateAlarmEmergencyResponse(site, start, end);
    const incidentManagement = await calculateIncidentManagement(site, start, end);
    const reportingAccuracy = await calculateReportingAccuracy(site, start, end);
    const communication = await calculateCommunicationScoreOverall(site, start, end);
    const systemUptime = 100;
    const customerService = await calculateCustomerService(site, start, end);

    const totalScore = Math.round(
      guardAccountability * CONTROL_ROOM_SCORE_WEIGHTS.guardAccountability / 100 +
      alarmEmergencyResponse * CONTROL_ROOM_SCORE_WEIGHTS.alarmEmergencyResponse / 100 +
      incidentManagement * CONTROL_ROOM_SCORE_WEIGHTS.incidentManagement / 100 +
      reportingAccuracy * CONTROL_ROOM_SCORE_WEIGHTS.reportingAccuracy / 100 +
      communication * CONTROL_ROOM_SCORE_WEIGHTS.communication / 100 +
      systemUptime * CONTROL_ROOM_SCORE_WEIGHTS.systemUptime / 100 +
      customerService * CONTROL_ROOM_SCORE_WEIGHTS.customerService / 100
    );

    let rating = 'POOR';
    if (totalScore >= 90) rating = 'EXCELLENT';
    else if (totalScore >= 80) rating = 'GOOD';
    else if (totalScore >= 70) rating = 'SATISFACTORY';
    else if (totalScore >= 60) rating = 'NEEDS_IMPROVEMENT';

    return ApiSuccess(res, {
      period: { start, end },
      components: {
        guardAccountability: { score: guardAccountability, weight: CONTROL_ROOM_SCORE_WEIGHTS.guardAccountability },
        alarmEmergencyResponse: { score: alarmEmergencyResponse, weight: CONTROL_ROOM_SCORE_WEIGHTS.alarmEmergencyResponse },
        incidentManagement: { score: incidentManagement, weight: CONTROL_ROOM_SCORE_WEIGHTS.incidentManagement },
        reportingAccuracy: { score: reportingAccuracy, weight: CONTROL_ROOM_SCORE_WEIGHTS.reportingAccuracy },
        communication: { score: communication, weight: CONTROL_ROOM_SCORE_WEIGHTS.communication },
        systemUptime: { score: systemUptime, weight: CONTROL_ROOM_SCORE_WEIGHTS.systemUptime },
        customerService: { score: customerService, weight: CONTROL_ROOM_SCORE_WEIGHTS.customerService }
      },
      totalScore,
      rating
    });
  } catch (error) {
    return ApiError(res, 'Failed to calculate control room score', 500, 'CONTROL_ROOM_SCORE_FAILED');
  }
};

async function calculateQRScore(guardId, site, start, end) {
  const scheduledQuery = { guard: guardId, scheduledTime: { $gte: start, $lte: end }, isActive: true };
  if (site) scheduledQuery.site = site;

  const scheduled = await PatrolSchedule.countDocuments(scheduledQuery);
  if (scheduled === 0) return 100;

  const completedQuery = { guard: guardId, scannedAt: { $gte: start, $lte: end } };
  if (site) completedQuery.site = site;

  const completed = await PatrolEvent.countDocuments(completedQuery);
  return Math.min(100, Math.round((completed / scheduled) * 100));
}

async function calculateAttendanceScore(guardId, start, end) {
  const shifts = await Shift.find({
    guard: guardId,
    startTime: { $gte: start, $lte: end }
  });

  if (shifts.length === 0) return 100;

  const completedShifts = shifts.filter(s => s.status === 'COMPLETED' || s.status === 'ACTIVE').length;
  return Math.round((completedShifts / shifts.length) * 100);
}

async function calculateCommunicationScore(guardId, site, start, end) {
  const query = { guard: guardId, sentAt: { $gte: start, $lte: end } };
  if (site) query.site = site;

  const communications = await RadioCommunication.find(query).lean();
  if (communications.length === 0) return 100;

  const responded = communications.filter(c => c.status === 'ACKNOWLEDGED').length;
  return Math.round((responded / communications.length) * 100);
}

async function calculateReportingScore(guardId, start, end) {
  const reports = await GuardReport.find({
    guard: guardId,
    createdAt: { $gte: start, $lte: end }
  });

  if (reports.length === 0) return 100;

  const approved = reports.filter(r => r.status === 'APPROVED').length;
  const returned = reports.filter(r => r.status === 'RETURNED').length;
  const total = reports.length;

  const accuracy = total > 0 ? ((total - returned) / total) * 100 : 100;
  const completeness = total > 0 ? (approved / total) * 100 : 100;

  return Math.round((accuracy + completeness) / 2);
}

async function calculateOverallGuardAccountability(site, start, end) {
  const query = { isActive: true };
  if (site) query.assignedSite = site;

  const guards = await Guard.find(query);
  if (guards.length === 0) return 100;

  const scores = await Promise.all(guards.map(async (guard) => {
    const qr = await calculateQRScore(guard._id, site, start, end);
    const attendance = await calculateAttendanceScore(guard._id, start, end);
    const communication = await calculateCommunicationScore(guard._id, site, start, end);
    const reporting = await calculateReportingScore(guard._id, start, end);
    return (qr + attendance + communication + reporting) / 4;
  }));

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

async function calculateAlarmEmergencyResponse(site, start, end) {
  const query = { receivedAt: { $gte: start, $lte: end } };
  if (site) query.site = site;

  const events = await AESEvent.find(query).lean();
  if (events.length === 0) return 100;

  const responseTimes = events
    .filter(e => e.responseTimeSeconds !== undefined)
    .map(e => e.responseTimeSeconds);

  if (responseTimes.length === 0) return 100;

  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const target = TARGETS.alarmResponseTime;

  if (avgResponseTime <= target) return 100;
  if (avgResponseTime <= target * 2) return Math.round(100 - ((avgResponseTime - target) / target) * 50);
  return Math.max(0, Math.round(50 - ((avgResponseTime - target * 2) / target) * 50));
}

async function calculateIncidentManagement(site, start, end) {
  const query = { reportedAt: { $gte: start, $lte: end } };
  if (site) query.site = site;

  const incidents = await Incident.find(query).lean();
  if (incidents.length === 0) return 100;

  const resolved = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  return Math.round((resolved / incidents.length) * 100);
}

async function calculateReportingAccuracy(site, start, end) {
  const query = { createdAt: { $gte: start, $lte: end } };
  if (site) query.site = site;

  const reports = await GuardReport.find(query).lean();
  if (reports.length === 0) return 100;

  const approved = reports.filter(r => r.status === 'APPROVED').length;
  const total = reports.length;

  return Math.round((approved / total) * 100);
}

async function calculateCommunicationScoreOverall(site, start, end) {
  const query = { sentAt: { $gte: start, $lte: end } };
  if (site) query.site = site;

  const communications = await RadioCommunication.find(query).lean();
  if (communications.length === 0) return 100;

  const acknowledged = communications.filter(c => c.status === 'ACKNOWLEDGED').length;
  return Math.round((acknowledged / communications.length) * 100);
}

async function calculateCustomerService(site, start, end) {
  const query = { reportedAt: { $gte: start, $lte: end } };
  if (site) query.site = site;

  const incidents = await Incident.find(query).lean();
  const complaints = incidents.filter(i => i.incidentType === 'CUSTOMER_COMPLAINT').length;
  const total = incidents.length;

  if (total === 0) return 100;

  const complaintRate = (complaints / total) * 100;
  return Math.max(0, Math.round(100 - complaintRate * 10));
}
